import { ConnectorConfig, DataConnect, QueryRef, QueryPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




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

export interface GetPatientByIdVariables {
  id: UUIDString;
}

export interface ListPatientsByOrgData {
  patients: ({
    id: UUIDString;
    name: string;
    email?: string | null;
    phone?: string | null;
    mainCondition?: string | null;
  } & Patient_Key)[];
}

export interface ListPatientsByOrgVariables {
  organizationId: UUIDString;
}

export interface Patient_Key {
  id: UUIDString;
  __typename?: 'Patient_Key';
}

interface ListPatientsByOrgRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListPatientsByOrgVariables): QueryRef<ListPatientsByOrgData, ListPatientsByOrgVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListPatientsByOrgVariables): QueryRef<ListPatientsByOrgData, ListPatientsByOrgVariables>;
  operationName: string;
}
export const listPatientsByOrgRef: ListPatientsByOrgRef;

export function listPatientsByOrg(vars: ListPatientsByOrgVariables): QueryPromise<ListPatientsByOrgData, ListPatientsByOrgVariables>;
export function listPatientsByOrg(dc: DataConnect, vars: ListPatientsByOrgVariables): QueryPromise<ListPatientsByOrgData, ListPatientsByOrgVariables>;

interface GetPatientByIdRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPatientByIdVariables): QueryRef<GetPatientByIdData, GetPatientByIdVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPatientByIdVariables): QueryRef<GetPatientByIdData, GetPatientByIdVariables>;
  operationName: string;
}
export const getPatientByIdRef: GetPatientByIdRef;

export function getPatientById(vars: GetPatientByIdVariables): QueryPromise<GetPatientByIdData, GetPatientByIdVariables>;
export function getPatientById(dc: DataConnect, vars: GetPatientByIdVariables): QueryPromise<GetPatientByIdData, GetPatientByIdVariables>;

