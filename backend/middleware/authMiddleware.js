const jwt = require("jsonwebtoken");

const authMiddleware = (
  req,
  res,
  next
) => {
  try {
    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        message: "Bạn chưa đăng nhập",
      });
    }

    const token =
      authorization.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId =
      decoded.userId ||
      decoded.id ||
      decoded._id;

    if (!req.userId) {
      return res.status(401).json({
        message:
          "Token không chứa ID người dùng",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Token không hợp lệ hoặc đã hết hạn",
    });
  }
};

module.exports = authMiddleware;