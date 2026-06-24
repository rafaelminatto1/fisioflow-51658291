#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

import browser_cookie3
import requests

BASE = 'https://fisioflow-api.rafalegollas.workers.dev'
WEB_BASE = 'https://www.moocafisio.com.br'
DEFAULT_PAYLOAD_PATH = Path('scripts/zenfisio-scraper/payload.json')


def get_session() -> requests.Session:
    jar = browser_cookie3.chrome(domain_name='moocafisio.com.br')
    session = requests.Session()
    resp = session.get(
        f'{WEB_BASE}/__neon-auth/get-session',
        cookies=jar,
        timeout=30,
        headers={'Accept': 'application/json'},
    )
    resp.raise_for_status()
    jwt = resp.headers.get('set-auth-jwt')
    if not jwt:
        raise SystemExit(
            'JWT ausente em /__neon-auth/get-session. Abra o MoocaFisio logado no Chrome e tente novamente.'
        )
    session.headers.update(
        {
            'Authorization': 'Bearer ' + jwt,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        }
    )
    return session


def load_payload(path: Path, limit_patients: int | None = None) -> dict:
    payload = json.loads(path.read_text(encoding='utf-8'))
    patients = payload.get('patients', [])
    if limit_patients is not None:
        patients = patients[: max(limit_patients, 0)]
    return {
        'replaceExisting': bool(payload.get('replaceExisting', True)),
        'dryRun': bool(payload.get('dryRun', True)),
        'patients': patients,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Envia o payload ZenFisio para /api/import/legacy-data usando a sessão logada do Chrome.'
    )
    parser.add_argument('--payload-path', default=str(DEFAULT_PAYLOAD_PATH), help='Caminho do payload.json')
    parser.add_argument('--limit-patients', type=int, help='Limita quantidade de pacientes do payload')
    parser.add_argument('--apply', action='store_true', help='Executa importação real (dryRun=false).')
    parser.add_argument(
        '--replace-existing',
        choices=['true', 'false'],
        default='false',
        help='Se true, limpa a organização antes de importar. Default: false.',
    )
    parser.add_argument(
        '--output-json',
        help='Salva a resposta completa em arquivo JSON.',
    )
    args = parser.parse_args()

    payload = load_payload(Path(args.payload_path), args.limit_patients)
    payload['dryRun'] = not args.apply
    payload['replaceExisting'] = args.replace_existing == 'true'

    print(
        f"Enviando payload: patients={len(payload['patients'])} dryRun={payload['dryRun']} replaceExisting={payload['replaceExisting']}",
        flush=True,
    )

    session = get_session()
    resp = session.post(f'{BASE}/api/import/legacy-data', data=json.dumps(payload), timeout=600)
    print(f'HTTP {resp.status_code}', flush=True)
    resp.raise_for_status()
    body = resp.json()

    summary = body.get('summary', {})
    print('success =', body.get('success'), flush=True)
    print('dryRun =', body.get('dryRun'), flush=True)
    print('replaceExisting =', body.get('replaceExisting'), flush=True)
    print('totalPatients =', summary.get('totalPatients'), flush=True)
    print('importedPatients =', summary.get('importedPatients'), flush=True)
    print('failedPatients =', summary.get('failedPatients'), flush=True)
    print('totalSessions =', summary.get('totalSessions'), flush=True)
    print('importedSessions =', summary.get('importedSessions'), flush=True)
    print('failedSessions =', summary.get('failedSessions'), flush=True)
    print('importedAppointments =', summary.get('importedAppointments'), flush=True)

    warnings = body.get('warnings') or []
    if warnings:
        print('\nWarnings:', flush=True)
        for item in warnings:
            print('-', item, flush=True)

    results = body.get('results') or []
    failed = [r for r in results if r.get('status') in {'failed', 'wouldFail'}]
    if failed:
        print('\nPrimeiras falhas:', flush=True)
        for item in failed[:10]:
            print(
                f"- {item.get('fullName')} status={item.get('status')} errors={item.get('errors')}",
                flush=True,
            )

    if args.output_json:
        output_path = Path(args.output_json)
        output_path.write_text(json.dumps(body, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print(f'\nResposta salva em {output_path}', flush=True)

    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except requests.HTTPError as exc:
        response = exc.response
        status = response.status_code if response is not None else 'sem-status'
        body = response.text[:2000] if response is not None else str(exc)
        print(f'HTTPError status={status} body={body}', file=sys.stderr, flush=True)
        raise
