# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listPatientsByOrg, getPatientById } from '@fisioflow/dataconnect';


// Operation listPatientsByOrg:  For variables, look at type ListPatientsByOrgVars in ../index.d.ts
const { data } = await ListPatientsByOrg(dataConnect, listPatientsByOrgVars);

// Operation getPatientById:  For variables, look at type GetPatientByIdVars in ../index.d.ts
const { data } = await GetPatientById(dataConnect, getPatientByIdVars);


```