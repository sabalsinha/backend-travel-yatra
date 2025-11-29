// middleware/basicAuth.js
export const basicAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  // Example: "Basic dXNlcjpwYXNz"
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString("ascii");

  const [username, password] = credentials.split(":");

  // Replace these with .env configs or DB lookup
  const VALID_USER = process.env.BASIC_USER;
  const VALID_PASS = process.env.BASIC_PASS;

  if (username === VALID_USER && password === VALID_PASS) {
    return next();
  }

  return res.status(403).json({ message: "Invalid credentials" });
};
