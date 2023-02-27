import ControlError from '../classes/error.class'
import validateRequest from '../schemas/request.validate' 
import objectHelpers from './object.helpers'

/**
* Fetch client and return text response
* @returns {}
*/
const fetchClient = async (url, options) => {
  const req = new Request(url, options)
  const letCodes = [400, 401, 403, 404, 405,407, 408, 429]
  const response = await fetch(req, { cf: { cacheTtl: 0 } })
  if (!response.ok) {
    const stsError = letCodes.includes(response.status) ? response.status : 424 
    return  { "errorRes": 'Client API responded with error', "statusRes":  `${stsError}` }
  }
  return response.text()
}

/*
* Gets the payload of a Http request and validate it
* @param request
* @returns {Promise<*>}
*/
const validatePayload = async (request) => {
  let payload
  try {
    payload = await request.json();      
  } catch (e) {
    throw new ControlError(`Invalid Request payload. ${e && e.message}`, 413)
  }
  const validationResult = {
    true: false,
    errors: 'Invalid schema for validation'
  }
  try {
    validationResult.valid = validateRequest(payload)
    validationResult.valid = objectHelpers.isUndefined(validationResult.valid) || validationResult.valid
    validationResult.errors = validateRequest.errors  
  } catch (e) {
    throw new ControlError(`Failed Request Validation. ${e && e.message}`, 413)
  }
  if (!validationResult.valid) {
    const errorMessage = `Request Validation Failed. ${validationResult.errors ? ` ${JSON.stringify(validationResult.errors)}` : ''}`
    throw new ControlError(`${errorMessage}`, 413)
  }
  return payload
}

/**
* Returns array of dates 
* @returns {*[]}
*/
const fullRangeDates = (fromDate, toDate) => {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const aDates = [];
  for(var dt=start; dt<=end; dt.setDate(dt.getDate()+1)){
    aDates.push(dt.toISOString().slice(0,10));
  }
  return aDates;
}

export default {
  fetchClient,
  validatePayload,
  fullRangeDates
}
