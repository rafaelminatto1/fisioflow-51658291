import Ajv from "ajv/dist/2020";
import dynamicCompareSchema from "../../../schemas/dynamic_compare_metrics.schema.json";
import addFormats from "ajv-formats";

const ajv = new Ajv({
    allErrors: true,
    strict: false,
    strictSchema: false, // loosen schema strictness
});

// @ts-ignore - ajv-formats might not be installed, handle gracefully
try { addFormats(ajv); } catch (e) { console.warn("ajv-formats not installed"); }

const validate = ajv.compile(dynamicCompareSchema);

export const validateDynamicCompare = (data: unknown): { ok: boolean; errors?: string[] } => {
    const valid = validate(data);
    if (!valid) {
        return {
            ok: false,
            errors: validate.errors?.map(e => `${e.instancePath} ${e.message}`)
        };
    }
    return { ok: true };
};
