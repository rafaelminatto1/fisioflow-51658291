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
DEFAULT_OUTPUT_PATH = Path('/tmp/import-zenfisio-browser-batches.json')


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


def load_patients(path: Path, limit_patients: int | None = None) -> list[dict]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    patients = payload.get('patients', [])
    if limit_patients is not None:
        patients = patients[: max(limit_patients, 0)]
    return patients


def build_empty_result(total_patients: int, total_sessions: int, chunk_size: int, replace_existing: bool) -> dict:
    return {
        'success': True,
        'dryRun': False,
        'replaceExisting': replace_existing,
        'chunkSize': chunk_size,
        'totalPatients': total_patients,
        'chunks': [],
        'results': [],
        'summary': {
            'totalPatients': total_patients,
            'importedPatients': 0,
            'failedPatients': 0,
            'totalSessions': total_sessions,
            'importedSessions': 0,
            'failedSessions': 0,
            'importedAppointments': 0,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description='Importa o payload ZenFisio em lotes para evitar limite de requests por invocação do Cloudflare Worker.'
    )
    parser.add_argument('--payload-path', default=str(DEFAULT_PAYLOAD_PATH), help='Caminho do payload.json')
    parser.add_argument('--chunk-size', type=int, default=100, help='Quantidade de pacientes por lote. Default: 100.')
    parser.add_argument('--limit-patients', type=int, help='Limita quantidade de pacientes do payload')
    parser.add_argument('--apply', action='store_true', help='Executa importação real. Sem isso, aborta por segurança.')
    parser.add_argument(
        '--replace-existing',
        choices=['true', 'false'],
        default='false',
        help='Se true, limpa a organização antes do primeiro lote. Os demais lotes sempre usam false.',
    )
    parser.add_argument('--output-json', default=str(DEFAULT_OUTPUT_PATH), help='Salva a resposta agregada em arquivo JSON')
    args = parser.parse_args()

    if not args.apply:
        raise SystemExit('Abortado: use --apply para executar a importação real.')
    if args.chunk_size <= 0:
        raise SystemExit('--chunk-size deve ser maior que zero.')

    patients = load_patients(Path(args.payload_path), args.limit_patients)
    total_sessions = sum(len(patient.get('evolutions') or []) for patient in patients)
    replace_existing = args.replace_existing == 'true'
    aggregate = build_empty_result(len(patients), total_sessions, args.chunk_size, replace_existing)
    session = get_session()

    for start in range(0, len(patients), args.chunk_size):
        end = min(start + args.chunk_size, len(patients))
        chunk = patients[start:end]
        payload = {
            'replaceExisting': replace_existing and start == 0,
            'dryRun': False,
            'patients': chunk,
        }
        print(
            f'Enviando lote {start}-{end - 1}: patients={len(chunk)} replaceExisting={payload["replaceExisting"]}',
            flush=True,
        )
        resp = session.post(f'{BASE}/api/import/legacy-data', data=json.dumps(payload), timeout=600)
        print(f'HTTP {resp.status_code}', flush=True)
        if resp.status_code >= 400:
            print(resp.text[:4000], file=sys.stderr, flush=True)
            resp.raise_for_status()

        body = resp.json()
        summary = body.get('summary') or {}
        failed = [row for row in body.get('results', []) if row.get('status') == 'failed']
        print(
            '  success={success} importedPatients={imported} failedPatients={failed} importedSessions={sessions} failedSessions={failed_sessions} importedAppointments={appointments}'.format(
                success=body.get('success'),
                imported=summary.get('importedPatients'),
                failed=summary.get('failedPatients'),
                sessions=summary.get('importedSessions'),
                failed_sessions=summary.get('failedSessions'),
                appointments=summary.get('importedAppointments'),
            ),
            flush=True,
        )
        if failed:
            print('  Primeiras falhas do lote:', flush=True)
            for item in failed[:5]:
                print(
                    f"  - globalIndex={start + int(item.get('index', 0))} name={item.get('fullName')} errors={item.get('errors')}",
                    flush=True,
                )

        aggregate['chunks'].append({'start': start, 'end': end, 'body': body})
        for item in body.get('results', []):
            row = dict(item)
            row['globalIndex'] = start + int(row.get('index', 0))
            aggregate['results'].append(row)

        aggregate['success'] = bool(aggregate['success'] and body.get('success'))
        for key in ['importedPatients', 'failedPatients', 'importedSessions', 'failedSessions', 'importedAppointments']:
            aggregate['summary'][key] += int(summary.get(key) or 0)

        if failed:
            print('Parando porque houve falha no lote. Corrija antes de continuar.', flush=True)
            break

    output_path = Path(args.output_json)
    output_path.write_text(json.dumps(aggregate, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'\nResumo final parcial/completo salvo em {output_path}', flush=True)
    print('success =', aggregate['success'], flush=True)
    for key, value in aggregate['summary'].items():
        print(f'{key} = {value}', flush=True)
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
