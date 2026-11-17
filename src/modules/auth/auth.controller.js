const { NotFoundError } = require("../../errors/AppError");
const { toUserResponse } = require("./users.mapper");

function createAuthController({ authService, usersRepository }) {
  return {
    async register(req, res) {
      const user = await authService.register(req.validated.body);
      res.status(201).json(toUserResponse(user));
    },

    async login(req, res) {
      res.json(await authService.login(req.validated.body));
    },

    async me(req, res) {
      const user = await usersRepository.findById(req.user.id);
      if (!user) throw new NotFoundError("User");
      res.json(toUserResponse(user));
    }
  };
}

module.exports = { createAuthController };
