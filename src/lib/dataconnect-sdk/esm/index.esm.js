import { queryRef, executeQuery, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'default',
  service: 'fisioflow-migration-service',
  location: 'southamerica-east1'
};

export const listPatientsByOrgRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'listPatientsByOrg', inputVars);
}
listPatientsByOrgRef.operationName = 'listPatientsByOrg';

export function listPatientsByOrg(dcOrVars, vars) {
  return executeQuery(listPatientsByOrgRef(dcOrVars, vars));
}

export const getPatientByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'getPatientById', inputVars);
}
getPatientByIdRef.operationName = 'getPatientById';

export function getPatientById(dcOrVars, vars) {
  return executeQuery(getPatientByIdRef(dcOrVars, vars));
}

