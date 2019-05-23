/*
  - setup.js exists because global.* variables can't be declared in this file but they can be in there
  - on the other hand, process.env can't be changed in there but it can in here
  - jest is confusing sometimes
*/
module.exports = () => {
  process.env = Object.assign(process.env, {
    PASSWORD: "password"
  });
};
