import DatesConfig from "../classes/reponse.class"
import ControlError from "../classes/error.class"
import utils from "../helpers/utils"
import objectHelpers from "../helpers/object.helpers"
import cacheHelpers from "../helpers/cache.helpers"
import data from '../mockdata/mocksy.json'

const CLIENT = 'xx'
const SAVE_RESPONSE_IN_CACHE = false
const CACHE_MAX_AGE = 300

/*
https://httpbin.org/anything is a popular and simple online HTTP Request & Response Service that returns anything that is passed to request for testing purposes.
*/

export const clientHandler = async (request, event) => {
  try {
    const requestPayload = await utils.validatePayload(request);  
    const { origin, destination, roundtrip } = requestPayload
  
    if (roundtrip) {
      const resDataDeparture = JSON.stringify(data[0])
      const resDataReturn = JSON.stringify(data[1])    
      
      const transformedResponse = await transformResponseFromClient(resDataDeparture, resDataReturn)
      
      const options = cacheHelpers.getResponseOptions(CLIENT, requestPayload, SAVE_RESPONSE_IN_CACHE, CACHE_MAX_AGE)
      const response = new Response(JSON.stringify(transformedResponse), options)
      
      return response
    } else {
      const response =new Response(JSON.stringify(data, null, 2))
      return response
    }
  } catch (e) {
    return new Response(JSON.stringify({ "Error": `${e.message}`, "Satus": "400"}), { 
      status: 400,
      headers: { 
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }  
    })
  }
}

//-Transforms the client response to a final response format
const transformResponseFromClient = async (resDataDeparture, resDataReturn) => {
  const datesConfig = new DatesConfig();
  let dateFrom = '';

  const getRouteDates = (data, route, sendValidDate) => {
    let validDates = data.data.dates.map(day => day.departure.substr(0,10));
    validDates = validDates.sort();
    dateFrom = (route === 'departure') ? validDates[0] : dateFrom;
    if (sendValidDate) datesConfig[route].includedDates = validDates 
    else {
      const allDates = utils.fullRangeDates(dateFrom, validDates[validDates.length-1]);
      datesConfig[route].excludedDates = allDates.filter(d=>!validDates.includes(d));
    }
    datesConfig[route].minDate = dateFrom; 
    datesConfig[route].maxDate = validDates[validDates.length-1];
  }
  
  try {
    const resDeparture = JSON.parse(resDataDeparture);
    getRouteDates(resDeparture, 'departure', false);
    if (!objectHelpers.isEmpty(resDataReturn)) {
      const resReturn = JSON.parse(resDataReturn);
      getRouteDates(resReturn, 'return', false);
    }

    objectHelpers.cleanObject(datesConfig)

    return datesConfig; 
  } catch (e) {
    throw new ControlError(`Response transformation failed. ${e && e.message}.`, 412)
  }
}

export default clientHandler