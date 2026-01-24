import { auth } from '../config/firebase';

const DATA_CONNECT_ENDPOINT = process.env.EXPO_PUBLIC_DATA_CONNECT_URL;

export async function executeGQL(query: string, variables: any = {}) {
  const user = auth?.currentUser;
  const token = await user?.getIdToken();

  const response = await fetch(DATA_CONNECT_ENDPOINT!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await response.json();
  if (json.errors) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}
