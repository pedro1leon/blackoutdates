/**
* Returns options for make a Request
* @returns {*}
*/
const getResponseOptions = (client, payload, set_cache, cacheMaxAge) => {
  let resOptions = {
    status: 200,
    statusText: 'OK',
    headers: { 
      'content-type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    }
  }
  if (set_cache) {
    const tags = getTags(client, payload)
    resOptions = {
      status: 200,
      statusText: 'OK',
      headers: { 
        ...resOptions.headers,
        'Cache-Tag': tags.join(','),
        'Cache-Control': `public, max-age=${cacheMaxAge || 300}, s-maxage=${cacheMaxAge || 300}`
      }
    }
  }
  return resOptions 
}
  
/**
* Returns tags from request to be used in the response saved in cache
* @returns {*[]}
*/
const getTags = (client, payload) => {
  const { origin, destination, roundtrip } = payload
  return [
    client,
    origin,
    destination,
    roundtrip
  ]
}

/**
 * Creates a key from an url and payload to be saved in the CF cache
 * @returns {Promise<Request>}
 */
const getCacheKey = async (urlStr, payload) => {   
  // Filter to payload by keys
  let flatObject = {}
  flat(payload, '', 'File', flatObject)
  flatObject = Object.keys(flatObject)
    .sort()
    .reduce((res, key) => ((res[key] = flatObject[key]), res), {})

  const hash = await sha256(flatObject)
  const url = new URL(`${urlStr}?hash=${hash}`)
  
  // Convert to a GET to be able to cache
  return new Request(url.href, {
    method: 'GET'
  })
}

/**
 * Encodes a value with SHA-256 algorithm
 * @returns {Promise<string>}
 */
 const sha256 = async (body) => {
  const bodyStr = JSON.stringify(body)
  const msgBuffer = new TextEncoder().encode(bodyStr) // encode as UTF-8
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer) // hash the body
  const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert ArrayBuffer to Array
  const hashHex = hashArray.map((b) => ('00' + b.toString(16)).slice(-2)).join('') // convert bytes to hex string
  return hashHex
}

/**
 * Converts an object to an one level array by joining nested keys
 */
const flat = (obj, stack, prevType, flatObject) => {
  for (const property in obj) {
    const value = obj[property]
    if (Array.isArray(value)) {
      value.sort()
      flat(value, stack + property, 'array', flatObject)
    } else {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        if (prevType === 'array') {
          flat(
            value,
            stack + '[' + property + '].',
            'object',
            flatObject
          )
        } else {
          flat(value, stack + property + '.', 'object', flatObject)
        }
      } else {
        if (prevType === 'array') {
          flatObject[`${stack}[${property}]`] = value
        } else {
          flatObject[`${stack}${property}`] = value
        }
      }
    }
  }
}

export default {
  getResponseOptions,
  getCacheKey
}
