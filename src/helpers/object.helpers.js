const isUndefined = (v) => typeof v === 'undefined'
const isNull = (v) => v === null
const isEmpty = obj => [Object, Array].includes((obj || {}).constructor) && !Object.entries((obj || {})).length
const isArray = (v) => Array.isArray(v)

/*  Function to test if an object is a plain object, i.e. is constructed
**  by the built-in Object constructor and inherits directly from Object.prototype
**  or null. Some built-in objects pass the test, e.g. Math which is a plain object
**  and some host or exotic objects may pass also.
**
**  @param {} obj - value to test
**  @returns {Boolean} true if passes tests, false otherwise
*/
const isPlainObject = (obj) => {
  // Basic check for Type object that's not null
  if (typeof obj === 'object' && obj !== null) {
    // If Object.getPrototypeOf supported, use it
    if (typeof Object.getPrototypeOf === 'function') {
      const proto = Object.getPrototypeOf(obj)
      return proto === Object.prototype || proto === null
    }

    // Otherwise, use internal class
    // This should be reliable as if getPrototypeOf not supported, is pre-ES5
    return Object.prototype.toString.call(obj) === '[object Object]'
  }
  return false
}
  
/**
 * Removes empties values from an object
 */
const cleanObject = (obj) => {
  for (const k in obj) {
    const v = obj[k]
    if (isUndefined(v) || isNull(v) || isEmpty(v)){
      delete obj[k]
    }
    if (isPlainObject(v)) {
      cleanObject(v)
      if (isUndefined(v) || isNull(v) || isEmpty(v)){
        delete obj[k]
      }
    } else if (isArray(v)) {
      v.forEach(vv => cleanObject(vv))
    }
  }
}

export default {
  isUndefined,
  isEmpty,
  isPlainObject,
  cleanObject
}
