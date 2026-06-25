import { Navigate, useLocation } from "react-router-dom";

const PATH_ALIASES: Array<[from: RegExp, to: string]> = [
  [/^\/exercicios$/, "/exercises"],
  [/^\/exercicios\/videos$/, "/exercises/videos"],
  [/^\/exercicios\/templates$/, "/exercises/templates"],
  [/^\/exercicios\/protocolos$/, "/exercises/protocols"],
  [/^\/exercicios\/ia$/, "/exercises/ai"],
  [/^\/exercicios\/analytics$/, "/exercises/analytics"],
  [/^\/exercicios\/busca-ia$/, "/exercises/search-ai"],
  [/^\/exercicios\/curadoria$/, "/exercises/curation"],
  [/^\/exercicios\/([^/]+)\/evidencia$/, "/exercises/$1/evidence"],
];

function resolvePathname(pathname: string) {
  for (const [pattern, replacement] of PATH_ALIASES) {
    if (pattern.test(pathname)) {
      return pathname.replace(pattern, replacement);
    }
  }

  return "/exercises";
}

export default function ExercisesLegacyRedirect() {
  const location = useLocation();
  const pathname = resolvePathname(location.pathname);

  return <Navigate to={`${pathname}${location.search}${location.hash}`} replace />;
}
