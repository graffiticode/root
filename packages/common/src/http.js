import cors from "cors";
import express from "express";
import morgan from "morgan";
import {
  DeadlineExceededError,
  InvalidArgumentError,
  NotFoundError,
  NotImplementedError,
  ResourceExhaustedError,
  UnauthenticatedError,
  UnauthorizedError,
  UnavailableError
} from "./errors.js";
import { isNonEmptyString } from "./utils.js";

export const createError = (code, message) => ({ code, message });

export const createErrorResponse = error => ({ status: "error", error, data: null });

export const createSuccessResponse = data => ({ status: "success", error: null, data });

export const sendSuccessResponse = (res, data) => res.status(200).json(createSuccessResponse(data));

export const translateError = (err) => {
  if (err instanceof DeadlineExceededError) {
    return createError(504, err.message);
  }
  if (err instanceof InvalidArgumentError) {
    return createError(400, err.message);
  }
  if (err instanceof NotFoundError) {
    return createError(404, err.message);
  }
  if (err instanceof NotImplementedError) {
    return createError(501, err.message);
  }
  if (err instanceof ResourceExhaustedError) {
    return createError(429, err.message);
  }
  if (err instanceof UnauthenticatedError) {
    return createError(401, err.message);
  }
  if (err instanceof UnauthorizedError) {
    return createError(403, err.message);
  }
  if (err instanceof UnavailableError) {
    return createError(503, err.message);
  }
  return createError(500, err.message);
};

const handleError = (err, res) => {
  const error = translateError(err);
  res.status(error.code).json(createErrorResponse(error));
};

export const buildHttpHandler = handler => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (err) {
    next(err);
  }
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    console.error(err);
  } else {
    handleError(err, res);
  }
};

export const createHttpApp = addRoutesFn => {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.use(morgan("combined"));
  } else {
    app.use(morgan("dev"));
  }
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  // Add Routes
  addRoutesFn(app);
  app.get("/", (req, res) => res.sendStatus(200));

  // Handle errors
  app.use(errorHandler);

  return app;
};

export const parseTokenFromRequest = req => {
  const { access_token: queryAccessToken } = req.query;
  if (isNonEmptyString(queryAccessToken)) {
    return queryAccessToken;
  }
  let headerAuthToken = req.get("Authorization");
  if (isNonEmptyString(headerAuthToken)) {
    if (headerAuthToken.startsWith("Bearer ")) {
      headerAuthToken = headerAuthToken.slice("Bearer ".length);
    }
    return headerAuthToken;
  }
  return null;
};
