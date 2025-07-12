//generate 6 digit OTP
const otpGenerate = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

//response handler
const response = (res, statusCode, message, data = null) => {
  if (!res) {
    console.error("Response object is null ");
    return;
  }

  const responseObject = {
    status: statusCode < 400 ? "success" : "error",
    message,
    data,
  };

  return res.status(statusCode).json(responseObject);
};

module.exports = {otpGenerate,response}