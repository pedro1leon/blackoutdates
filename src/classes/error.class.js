class ControlError extends Error {
    constructor(message, code) {
      super(message)
      this.code = code
      this.name = 'ControlError'
    }
  }
  
  export default ControlError;
  