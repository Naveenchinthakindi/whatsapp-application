const jwt = require("jsonwebtoken");

//auth middleware
const authMiddleware = async (req, res, next) => {
  const token =
    req.cookies.auth_token || req.headers.authorization?.split(" ")[1]; //get the token from cookie or header

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY); // get the decoded data
    req.user = decoded; // Attach decoded user info to req

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = { authMiddleware };