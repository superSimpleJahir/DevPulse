import { StatusCodes } from "http-status-codes";
import { catchAsync } from "../../utils/catchAsync.js";
import { sendResponse } from "../../utils/sendResponse.js";
import { authService } from "./auth.service.js";

const signup = catchAsync(async (req, res) => {
  const result = await authService.signup(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: "User registered successfully",
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Login successful",
    data: result,
  });
});

export const authController = {
  signup,
  login,
};
