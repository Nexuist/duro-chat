module.exports = () => {
  process.env = Object.assign(process.env, {
    PASSWORD: "password"
  });
};
