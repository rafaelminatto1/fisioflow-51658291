const { queryRef, executeQuery, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'fisioflow-migration-service',
  location: 'southamerica-east1'
};
exports.connectorConfig = connectorConfig;

const listPatientsByOrgRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'listPatientsByOrg', inputVars);
}
listPatientsByOrgRef.operationName = 'listPatientsByOrg';
exports.listPatientsByOrgRef = listPatientsByOrgRef;

exports.listPatientsByOrg = function listPatientsByOrg(dcOrVars, vars) {
  return executeQuery(listPatientsByOrgRef(dcOrVars, vars));
};

const getPatientByIdRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'getPatientById', inputVars);
}
getPatientByIdRef.operationName = 'getPatientById';
exports.getPatientByIdRef = getPatientByIdRef;

exports.getPatientById = function getPatientById(dcOrVars, vars) {
  return executeQuery(getPatientByIdRef(dcOrVars, vars));
};
