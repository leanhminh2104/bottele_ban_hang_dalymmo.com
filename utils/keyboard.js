import { getLanguageButtons } from "../config/i18n.js";

function buildRowsFromLabels(labels) {
  const rows = [];
  for (let i = 0; i < labels.length; i += 2) {
    rows.push(labels.slice(i, i + 2).map(label => ({ text: label })));
  }
  return rows;
}

export function mainMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.buy }],
      [{ text: buttons.topup }],
      [{ text: buttons.personal }]
    ],
    resize_keyboard: true
  };
}

export function adminMenu(locale) {
  const { buttons } = locale;
  const shopManageButton = buttons.shopManage || "📦 Quản lý hàng hóa";
  return {
    keyboard: [
      [{ text: buttons.buy }, { text: buttons.topup }],
      [{ text: buttons.import }, { text: buttons.personal }],
      [{ text: shopManageButton }, { text: buttons.settings }]
    ],
    resize_keyboard: true
  };
}

export function personalMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.balance }, { text: buttons.language }],
      [{ text: buttons.personalInfo }],
      [{ text: buttons.personalBalanceChanges }, { text: buttons.personalOrderHistory }],
      [{ text: buttons.personalBack }]
    ],
    resize_keyboard: true
  };
}

export function adminSettingsMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.ping }, { text: buttons.cpu }],
      [{ text: buttons.autoBank }, { text: buttons.autoBankUserInfo }],
      [{ text: buttons.adminManage }, { text: buttons.setupManual }],
      [{ text: buttons.settingsBack }]
    ],
    resize_keyboard: true
  };
}

export function autoBankMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.autoBankSet }, { text: buttons.autoBankHistory }],
      [{ text: buttons.autoBankBankInfo }],
      [{ text: buttons.autoBankManualAdjust }, { text: buttons.autoBankBack }]
    ],
    resize_keyboard: true
  };
}

export function acbTokenMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.autoBankTokenEdit }, { text: buttons.autoBankTokenDelete }],
      [{ text: buttons.autoBankTokenBack }]
    ],
    resize_keyboard: true
  };
}

export function bankSettingsMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.bankFieldBank }, { text: buttons.bankFieldAccountName }],
      [{ text: buttons.bankFieldAccountNumber }, { text: buttons.bankFieldMinAmount }],
      [{ text: buttons.bankFieldNote }],
      [{ text: buttons.bankSettingsBack }]
    ],
    resize_keyboard: true
  };
}

export function customerInfoMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.customerInfoList }, { text: buttons.customerInfoCheckById }],
      [{ text: buttons.customerInfoBack }]
    ],
    resize_keyboard: true
  };
}

export function setupMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [[{ text: buttons.setupInit }]],
    resize_keyboard: true
  };
}

export function languageMenu(locale) {
  const rows = buildRowsFromLabels(getLanguageButtons());
  rows.push([{ text: locale.buttons.languageBack }]);
  return {
    keyboard: rows,
    resize_keyboard: true
  };
}

export function manualAdjustActionMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.manualAdd }, { text: buttons.manualSubtract }],
      [{ text: buttons.cancel }]
    ],
    resize_keyboard: true
  };
}

export function cancelMenu(locale) {
  return {
    keyboard: [[{ text: locale.buttons.cancel }]],
    resize_keyboard: true
  };
}

export function adminManageMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.adminAdd }, { text: buttons.adminRemove }],
      [{ text: buttons.adminList }, { text: buttons.adminManageBack }]
    ],
    resize_keyboard: true
  };
}

export function adminRemoveMenu(locale, adminEntries = []) {
  const labels = adminEntries.map(entry => locale.texts.adminButtonLabel(entry));
  const rows = buildRowsFromLabels(labels);
  rows.push([{ text: locale.buttons.cancel }]);
  return {
    keyboard: rows,
    resize_keyboard: true
  };
}

export function topupActionMenu(locale) {
  const { buttons } = locale;
  return {
    keyboard: [
      [{ text: buttons.topupConfirm }, { text: buttons.topupSupport }],
      [{ text: buttons.topupBack }]
    ],
    resize_keyboard: true
  };
}

export const INLINE_ACTIONS = {
  topupConfirm: "topup_confirm"
};

export function topupConfirmInline(locale) {
  return {
    inline_keyboard: [[{ text: locale.buttons.topupConfirm, callback_data: INLINE_ACTIONS.topupConfirm }]]
  };
}
