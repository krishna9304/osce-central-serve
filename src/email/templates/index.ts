export enum EmailTemplate {
  signup_success = 'signup',
  recharge_success = 'recharge_success',
}

export const sendGridTemplates = {
  [EmailTemplate.signup_success]: 'd-230fea1f152d4dceaec92ec36f16b4ac',
  [EmailTemplate.recharge_success]: 'd-79757a9110ea47a49f2c8a12d8ca66b9',
};
