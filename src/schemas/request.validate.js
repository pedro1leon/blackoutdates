"use strict"

export default validate20

function validate20(data, {
    instancePath = "",
    parentData,
    parentDataProperty,
    rootData = data
} = {}) {
    let vErrors = null;
    let errors = 0;
    if (errors === 0) {
        if (data && typeof data == "object" && !Array.isArray(data)) {
            let missing0;
            if ((((data.origin === undefined) && (missing0 = "origin")) || ((data.destination === undefined) && (missing0 = "destination"))) || ((data.roundtrip === undefined) && (missing0 = "roundtrip"))) {
                validate20.errors = [{
                    instancePath,
                    schemaPath: "#/required",
                    keyword: "required",
                    params: {
                        missingProperty: missing0
                    },
                    message: "must have required property '" + missing0 + "'"
                }];
                return false;
            } else {
                if (data.origin !== undefined) {
                    const _errs1 = errors;
                    if (typeof data.origin !== "string") {
                        validate20.errors = [{
                            instancePath: instancePath + "/origin",
                            schemaPath: "#/properties/origin/type",
                            keyword: "type",
                            params: {
                                type: "string"
                            },
                            message: "must be string"
                        }];
                        return false;
                    }
                    var valid0 = _errs1 === errors;
                } else {
                    var valid0 = true;
                }
                if (valid0) {
                    if (data.destination !== undefined) {
                        const _errs3 = errors;
                        if (typeof data.destination !== "string") {
                            validate20.errors = [{
                                instancePath: instancePath + "/destination",
                                schemaPath: "#/properties/destination/type",
                                keyword: "type",
                                params: {
                                    type: "string"
                                },
                                message: "must be string"
                            }];
                            return false;
                        }
                        var valid0 = _errs3 === errors;
                    } else {
                        var valid0 = true;
                    }
                    if (valid0) {
                        if (data.roundtrip !== undefined) {
                            let data2 = data.roundtrip;
                            const _errs5 = errors;
                            if ((typeof data2 !== "boolean") && (typeof data2 !== "string")) {
                                validate20.errors = [{
                                    instancePath: instancePath + "/roundtrip",
                                    schemaPath: "#/properties/roundtrip/type",
                                    keyword: "type",
                                    params: {
                                        type: ["boolean", "string"]
                                    },
                                    message: "must be boolean,string"
                                }];
                                return false;
                            }
                            var valid0 = _errs5 === errors;
                        } else {
                            var valid0 = true;
                        }
                    }
                }
            }
        } else {
            validate20.errors = [{
                instancePath,
                schemaPath: "#/type",
                keyword: "type",
                params: {
                    type: "object"
                },
                message: "must be object"
            }];
            return false;
        }
    }
    validate20.errors = vErrors;
    return errors === 0;
}