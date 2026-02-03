# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*listPatientsByOrg*](#listpatientsbyorg)
  - [*getPatientById*](#getpatientbyid)
- [**Mutations**](#mutations)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@fisioflow/dataconnect` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@fisioflow/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@fisioflow/dataconnect';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## listPatientsByOrg
You can execute the `listPatientsByOrg` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
listPatientsByOrg(vars: ListPatientsByOrgVariables): QueryPromise<ListPatientsByOrgData, ListPatientsByOrgVariables>;

interface ListPatientsByOrgRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPatientsByOrgVariables): QueryRef<ListPatientsByOrgData, ListPatientsByOrgVariables>;
}
export const listPatientsByOrgRef: ListPatientsByOrgRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPatientsByOrg(dc: DataConnect, vars: ListPatientsByOrgVariables): QueryPromise<ListPatientsByOrgData, ListPatientsByOrgVariables>;

interface ListPatientsByOrgRef {
  ...
  (dc: DataConnect, vars: ListPatientsByOrgVariables): QueryRef<ListPatientsByOrgData, ListPatientsByOrgVariables>;
}
export const listPatientsByOrgRef: ListPatientsByOrgRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPatientsByOrgRef:
```typescript
const name = listPatientsByOrgRef.operationName;
console.log(name);
```

### Variables
The `listPatientsByOrg` query requires an argument of type `ListPatientsByOrgVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListPatientsByOrgVariables {
  organizationId: UUIDString;
}
```
### Return Type
Recall that executing the `listPatientsByOrg` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPatientsByOrgData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListPatientsByOrgData {
  patients: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phone?: string | null;
    mainCondition?: string | null;
  } & Patient_Key)[];
}
```
### Using `listPatientsByOrg`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPatientsByOrg, ListPatientsByOrgVariables } from '@fisioflow/dataconnect';

// The `listPatientsByOrg` query requires an argument of type `ListPatientsByOrgVariables`:
const listPatientsByOrgVars: ListPatientsByOrgVariables = {
  organizationId: ..., 
};

// Call the `listPatientsByOrg()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPatientsByOrg(listPatientsByOrgVars);
// Variables can be defined inline as well.
const { data } = await listPatientsByOrg({ organizationId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPatientsByOrg(dataConnect, listPatientsByOrgVars);

console.log(data.patients);

// Or, you can use the `Promise` API.
listPatientsByOrg(listPatientsByOrgVars).then((response) => {
  const data = response.data;
  console.log(data.patients);
});
```

### Using `listPatientsByOrg`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPatientsByOrgRef, ListPatientsByOrgVariables } from '@fisioflow/dataconnect';

// The `listPatientsByOrg` query requires an argument of type `ListPatientsByOrgVariables`:
const listPatientsByOrgVars: ListPatientsByOrgVariables = {
  organizationId: ..., 
};

// Call the `listPatientsByOrgRef()` function to get a reference to the query.
const ref = listPatientsByOrgRef(listPatientsByOrgVars);
// Variables can be defined inline as well.
const ref = listPatientsByOrgRef({ organizationId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPatientsByOrgRef(dataConnect, listPatientsByOrgVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.patients);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.patients);
});
```

## getPatientById
You can execute the `getPatientById` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-sdk/index.d.ts](./index.d.ts):
```typescript
getPatientById(vars: GetPatientByIdVariables): QueryPromise<GetPatientByIdData, GetPatientByIdVariables>;

interface GetPatientByIdRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPatientByIdVariables): QueryRef<GetPatientByIdData, GetPatientByIdVariables>;
}
export const getPatientByIdRef: GetPatientByIdRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPatientById(dc: DataConnect, vars: GetPatientByIdVariables): QueryPromise<GetPatientByIdData, GetPatientByIdVariables>;

interface GetPatientByIdRef {
  ...
  (dc: DataConnect, vars: GetPatientByIdVariables): QueryRef<GetPatientByIdData, GetPatientByIdVariables>;
}
export const getPatientByIdRef: GetPatientByIdRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPatientByIdRef:
```typescript
const name = getPatientByIdRef.operationName;
console.log(name);
```

### Variables
The `getPatientById` query requires an argument of type `GetPatientByIdVariables`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPatientByIdVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `getPatientById` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPatientByIdData`, which is defined in [dataconnect-sdk/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPatientByIdData {
  patient?: {
    id: UUIDString;
    name: string;
    email?: string | null;
    phone?: string | null;
    cpf?: string | null;
    address?: string | null;
    birthDate?: DateString | null;
    mainCondition?: string | null;
    medicalHistory?: string | null;
  } & Patient_Key;
}
```
### Using `getPatientById`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPatientById, GetPatientByIdVariables } from '@fisioflow/dataconnect';

// The `getPatientById` query requires an argument of type `GetPatientByIdVariables`:
const getPatientByIdVars: GetPatientByIdVariables = {
  id: ..., 
};

// Call the `getPatientById()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPatientById(getPatientByIdVars);
// Variables can be defined inline as well.
const { data } = await getPatientById({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPatientById(dataConnect, getPatientByIdVars);

console.log(data.patient);

// Or, you can use the `Promise` API.
getPatientById(getPatientByIdVars).then((response) => {
  const data = response.data;
  console.log(data.patient);
});
```

### Using `getPatientById`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPatientByIdRef, GetPatientByIdVariables } from '@fisioflow/dataconnect';

// The `getPatientById` query requires an argument of type `GetPatientByIdVariables`:
const getPatientByIdVars: GetPatientByIdVariables = {
  id: ..., 
};

// Call the `getPatientByIdRef()` function to get a reference to the query.
const ref = getPatientByIdRef(getPatientByIdVars);
// Variables can be defined inline as well.
const ref = getPatientByIdRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPatientByIdRef(dataConnect, getPatientByIdVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.patient);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.patient);
});
```

# Mutations

No mutations were generated for the `default` connector.

If you want to learn more about how to use mutations in Data Connect, you can follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

