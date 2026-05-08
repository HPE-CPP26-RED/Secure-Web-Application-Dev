/**
 * users.controller.js
 * RBAC note: admin-only routes (getAllUsers, createUser) are protected by
 * verifyAdmin middleware in the router — no duplicate role checks needed here.
 * Self-or-admin checks (getUserById, updateUser, deleteUser) use 403 Forbidden.
 */
const userService = require("../services/user.service");
const { ErrorHandler } = require("../helpers/error");
const { hashPassword } = require("../helpers/hashPassword");
const { logger } = require("../utils/logger");

const getAllUsers = async (req, res) => {
  const results = await userService.getAllUsers();
  res.status(200).json(results);
};

const createUser = async (req, res) => {
  const { username, password, email, fullname } = req.body;
  const hashedPassword = await hashPassword(password);

  const user = await userService.createUser({
    username,
    password: hashedPassword,
    email,
    fullname,
  });

  res.status(201).json({ status: "success", user });
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  const isSelf = +id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn({
      event: "AUTHZ_FAILURE",
      action: "getUserById",
      requestedId: id,
      requesterId: req.user.id,
    });
    throw new ErrorHandler(403, "Forbidden");
  }

  const user = await userService.getUserById(id);
  return res.status(200).json(user);
};

const getUserProfile = async (req, res) => {
  const { id } = req.user;
  const user = await userService.getUserById(id);
  return res.status(200).json(user);
};

const updateUser = async (req, res) => {
  const { username, email, fullname, address, city, state, country } = req.body;
  const isSelf = +req.params.id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn({
      event: "AUTHZ_FAILURE",
      action: "updateUser",
      requestedId: req.params.id,
      requesterId: req.user.id,
    });
    throw new ErrorHandler(403, "Forbidden");
  }

  const results = await userService.updateUser({
    username,
    email,
    fullname,
    address,
    city,
    state,
    country,
    id: req.params.id,
  });
  return res.status(200).json(results);
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  const isSelf = +id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isSelf && !isAdmin) {
    logger.warn({
      event: "AUTHZ_FAILURE",
      action: "deleteUser",
      requestedId: id,
      requesterId: req.user.id,
    });
    throw new ErrorHandler(403, "Forbidden");
  }

  const result = await userService.deleteUser(id);
  res.status(200).json(result);
};

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserProfile,
};
