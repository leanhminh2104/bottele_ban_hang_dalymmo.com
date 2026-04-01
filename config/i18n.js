const NUMBER_FORMATTERS = {
  vi: new Intl.NumberFormat("vi-VN"),
  en: new Intl.NumberFormat("en-US")
};

const DATE_FORMATTERS = {
  vi: new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }),
  en: new Intl.DateTimeFormat("en-US", { dateStyle: "short", timeStyle: "short" })
};

function formatCurrencyValue(language, amount = 0) {
  const formatter = NUMBER_FORMATTERS[language] || NUMBER_FORMATTERS.vi;
  const numeric = Number(amount);
  return formatter.format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDateTimeValue(language, value) {
  const formatter = DATE_FORMATTERS[language] || DATE_FORMATTERS.vi;
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return formatter.format(new Date());
  }
  return formatter.format(date);
}

function currencyWithSymbol(language, amount = 0) {
  return `${formatCurrencyValue(language, amount)}₫`;
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function codeTag(value = "") {
  return `<code>${escapeHtml(value)}</code>`;
}

function spoilerCodeTag(value = "") {
  return `<tg-spoiler>${escapeHtml(value)}</tg-spoiler>`;
}

function maskToken(value = "") {
  const token = String(value || "");
  if (!token) return "";
  if (token.length <= 8) {
    return `${token.slice(0, 2)}***${token.slice(-2)}`;
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

const translations = {
  vi: {
    code: "vi",
    name: "Tiếng Việt",
    languageLabel: "🇻🇳 Tiếng Việt",
    synonyms: ["vi", "tieng viet", "tiếng việt"],
    buttons: {
      buy: "🛒 Mua tài khoản",
      balance: "💰 Số dư",
      topup: "💳 Nạp tiền",
      personal: "👤 Cá nhân",
      personalInfo: "ℹ️ Thông tin",
      personalBalanceChanges: "📈 Biến động số dư",
      personalOrderHistory: "🧾 Lịch sử đơn hàng",
      personalBack: "⬅️ Quay lại menu",
      topupConfirm: "✅ Tôi đã thanh toán",
      topupBack: "⬅️ Quay lại menu",
      topupSupport: "🆘 Gửi yêu cầu hỗ trợ",
      import: "⚡ Nhập hàng nhanh",
      shopManage: "📦 Quản lý hàng hóa",
      settings: "🛠 Trang quản trị",
      language: "🌐 Ngôn ngữ",
      settingsBack: "⬅️ Thoát trang quản trị",
      languageBack: "⬅️ Quay lại",
      ping: "📶 Ping",
      cpu: "🖥 CPU",
      autoBank: "🏦 Auto bank",
      autoBankSet: "🔐 Token ACB",
      autoBankTokenEdit: "✏️ Sửa token",
      autoBankTokenDelete: "🗑 Xóa token",
      autoBankTokenBack: "⬅️ Quay lại auto bank",
      autoBankHistory: "📜 Lịch sử giao dịch",
      autoBankUserInfo: "👥 Thông tin khách",
      customerInfoList: "📋 List khách đã chat",
      customerInfoCheckById: "🔎 Check theo ID",
      customerInfoBack: "⬅️ Quay lại trang quản trị",
      autoBankBankInfo: "🏦 Cài đặt ngân hàng",
      autoBankManualAdjust: "💼 Điều chỉnh số dư",
      autoBankBack: "⬅️ Về cài đặt",
      adminManage: "🛡 Quản trị admin",
      adminAdd: "➕ Thêm admin",
      adminRemove: "➖ Xóa admin",
      adminList: "📋 Danh sách admin",
      adminManageBack: "⬅️ Về cài đặt",
      bankFieldBank: "🏦 Ngân hàng",
      bankFieldAccountName: "👤 Chủ tài khoản",
      bankFieldAccountNumber: "🔢 Số tài khoản",
      bankFieldMinAmount: "💵 Số tiền tối thiểu",
      bankFieldNote: "📝 Nội dung chuyển khoản",
      bankSettingsBack: "⬅️ Quay lại auto bank",
      setupManual: "🧱 Đổ dữ liệu",
      manualAdd: "➕ Cộng tiền",
      manualSubtract: "➖ Trừ tiền",
      cancel: "❌ Hủy thao tác",
      setupInit: "🧱 Khởi tạo dữ liệu"
    },
    texts: {
      greeting: "Chào bạn!\nChọn menu bên dưới để tiếp tục.",
      personalIntro: "Khu vực cá nhân:",
      holdSuccess: "Đã giữ tài khoản trong 5 phút. Thanh toán và gửi /done sau khi hoàn tất.",
      holdFailed: "Hiện không còn tài khoản phù hợp. Vui lòng thử lại sau.",
      balance: amount => `Số dư hiện tại: ${currencyWithSymbol("vi", amount)}`,
      importGuide: "Định dạng đúng: dòng đầu /import, các dòng tiếp theo là email|mật khẩu.",
      importDone: count => `Đã nhập ${count} tài khoản.`,
      buyGuide: "Vui lòng chọn \"💳 Nạp tiền\" để xem hướng dẫn chuyển khoản hoặc liên hệ admin nếu cần hỗ trợ.",
      noPermission: "Bạn không có quyền dùng lệnh này.",
      unknown: "Không hiểu yêu cầu. Dùng menu để thao tác nhé.",
      settingsSummary: settings => {
        const admins = (settings.admin_ids || []).join(", ");
        const token = settings.acb_token ? `Đã cài (${spoilerCodeTag(maskToken(settings.acb_token))})` : "Chưa cài";
        const bank = settings.account_number
          ? `${settings.bank_name || settings.bank_code} • ${codeTag(settings.account_number)}`
          : "Chưa cấu hình ngân hàng";
        return `Admin: ${admins || "(chưa có)"}\nAuto bank: ${token}\nNgân hàng: ${bank}`;
      },
      adminMenuIntro: "Trang quản trị:",
      settingsClosed: "Đã đóng trang quản trị.",
      backToMenu: "Đã quay lại menu.",
      chooseLanguage: "Chọn ngôn ngữ bạn muốn sử dụng:",
      languageUpdated: name => `Đã chuyển sang ${name}.`,
      languageSame: name => `${name} đang được sử dụng.`,
      languageInvalid: "Không nhận diện được ngôn ngữ. Vui lòng chọn lại.",
      setAcbHint: "Nhập token ACB mới (Auto bank hiện chỉ hỗ trợ ACB).",
      setAcbSuccess: "Đã cập nhật ACB token.",
      addAdminHint: "Gửi ID Telegram của admin cần thêm.",
      addAdminSuccess: id => `Đã thêm admin ${id}.`,
      adminManageIntro: "Chọn thao tác quản trị viên:",
      adminListEmpty: "Chưa có admin nào (ngoài bạn).",
      adminListTitle: count => `Danh sách admin (${count}):`,
      adminListItem: ({ index, id, isDefault, user }) => {
        const header = `${index}. Admin #${id}${isDefault ? " • (mặc định)" : ""}`;
        if (!user) {
          return `${header}\n   • Chưa có dữ liệu người dùng.`;
        }
        const name = user.full_name ? `   • Tên: ${user.full_name}` : null;
        const username = user.username ? `   • Username: @${user.username}` : null;
        const balance = currencyWithSymbol("vi", user.balance || 0);
        const lang = (user.language || DEFAULT_LANGUAGE).toUpperCase();
        const created = formatDateTimeValue("vi", user.created_at);
        const lastSeen = formatDateTimeValue("vi", user.last_seen_at);
        return [
          header,
          name,
          username,
          `   • Số dư: ${balance}`,
          `   • Ngôn ngữ: ${lang}`,
          `   • Tạo lúc: ${created}`,
          `   • Hoạt động gần nhất: ${lastSeen}`
        ]
          .filter(Boolean)
          .join("\n");
      },
      adminRemoveIntro: "Chọn admin cần xóa:",
      adminRemoveEmpty: "Chưa có admin nào để xóa.",
      adminRemoveSuccess: id => `Đã xóa admin ${id}.`,
      adminRemoveDefault: id => `Không thể xóa admin mặc định ${id}.`,
      adminRemoveFailed: id => `Không tìm thấy admin ${id}.`,
      adminButtonLabel: entry => {
        const id = typeof entry === "object" ? entry.id : entry;
        const user = typeof entry === "object" ? entry.user : null;
        const name = user?.full_name?.trim() || (user?.username ? `@${user.username}` : null);
        if (name) {
          return `${name} (#${id})`;
        }
        return `Admin #${id}`;
      },
      pingResponse: latency => `Pong! Độ trễ ${latency}ms`,
      cpuInfo: ({ cpuModel, load, usedGb, totalGb, usagePercent }) =>
        `CPU: ${cpuModel}\nTải (1 phút): ${load}\nRAM: ${usedGb}/${totalGb} GB (${usagePercent}%)`,
      restartInfo: "Bot chạy trên hạ tầng serverless của Vercel nên không thể tự khởi động lại. Deploy lại trên Vercel để áp dụng thay đổi.",
      languageMenuTitle: "Chọn ngôn ngữ:",
      unauthorized: "Bạn không có quyền dùng lệnh này.",
      autoBankStatus: settings => {
        const tokenLine = settings?.acb_token
          ? `Auto bank đang bật (token ${spoilerCodeTag(settings.acb_token)})`
          : "Auto bank chưa được cấu hình.";
        const bankLine = settings?.account_number
          ? `Ngân hàng: ${settings.bank_name || settings.bank_code} • ${codeTag(settings.account_number)}`
          : "Chưa cài thông tin ngân hàng.";
        return `${tokenLine}\n${bankLine}\nLưu ý: Auto bank chỉ hỗ trợ tài khoản ACB.`;
      },
      acbTokenMenuStatus: settings => {
        const tokenLine = settings?.acb_token
          ? `Token hiện tại: ${spoilerCodeTag(settings.acb_token)}`
          : "Token hiện tại: Chưa cài";
        return `Quản lý token ACB:\n${tokenLine}\nChọn thao tác bên dưới.`;
      },
      acbTokenDeleteSuccess: "Đã xóa token ACB.",
      autoBankMissingToken: "Auto bank chưa có token. Vui lòng cài đặt trước.",
      autoBankTestSuccess: count => `Kết nối ACB thành công. Nhận được ${count} giao dịch gần nhất.`,
      autoBankTestFailed: reason => `Không kiểm tra được ACB: ${reason || "Không xác định"}.`,
      autoBankHistoryTitle: count => `Lịch sử giao dịch gần nhất (${count}).`,
      autoBankHistoryEmpty: "API chưa trả về giao dịch nào.",
      customerInfoIntro: "Thông tin khách:",
      customerInfoListTitle: count => `Khách đã chat với bot (${count}):`,
      customerInfoListEmpty: "Chưa có khách nào chat với bot.",
      customerInfoListItem: ({ index, user }) => {
        const name = user?.full_name || "(chưa có tên)";
        const username = user?.username ? `@${user.username}` : "(chưa có username)";
        const lastSeen = formatDateTimeValue("vi", user?.last_seen_at);
        return `${index}. #${user?.user_id} • ${name} • ${username}\n   • Hoạt động gần nhất: ${lastSeen}`;
      },
      autoBankHistoryItem: ({ index, tran }) => {
        const amount = currencyWithSymbol("vi", tran.amount);
        const type = String(tran.type || "IN").toUpperCase() === "OUT" ? "Tiền ra" : "Tiền vào";
        return `${index}. #${tran.transactionID || tran.id} • ${type} • ${amount}\n└ ${tran.transactionDate || "(không rõ ngày)"} • ${tran.description || "(không có mô tả)"}`;
      },
      autoBankHistoryFooter: "Chỉ hiển thị tối đa 5 giao dịch mới nhất từ API.",
      autoBankUserInfoPrompt: "Nhập ID Telegram của khách cần xem (ví dụ 74299...).",
      autoBankUserInfoNotFound: id => `Không tìm thấy người dùng ${id}.`,
      autoBankUserInfoResult: ({ user, stats, transactions, orders }) => {
        const balance = currencyWithSymbol("vi", user.balance || 0);
        const lastSeen = formatDateTimeValue("vi", user.last_seen_at);
        const created = formatDateTimeValue("vi", user.created_at);
        const lines = [
          `👤 Khách #${user.user_id}`,
          `• Số dư: ${balance}`,
          `• Ngôn ngữ: ${user.language?.toUpperCase()}`,
          `• Tạo lúc: ${created}`,
          `• Hoạt động gần nhất: ${lastSeen}`,
          `• Đơn hàng: ${stats.orderCount}`,
          `• Lần nạp ghi nhận: ${stats.transactionCount}`,
          "",
          "📦 Đơn gần nhất:",
          ...(orders.length
            ? orders.map((order, idx) => `${idx + 1}. ${order.status} • ${formatDateTimeValue("vi", order.created_at)}`)
            : ["(Chưa có đơn)"]),
          "",
          "💳 Lịch sử nạp gần nhất:",
          ...(transactions.length
            ? transactions.map((tran, idx) => `${idx + 1}. ${currencyWithSymbol("vi", tran.amount)} • ${formatDateTimeValue("vi", tran.created_at)} • ${tran.tran_id}`)
            : ["(Chưa có giao dịch)"])
        ];
        return lines.join("\n");
      },
      personalInfoResult: ({ user, stats, transactions, orders }) => {
        const balance = currencyWithSymbol("vi", user.balance || 0);
        const lastSeen = formatDateTimeValue("vi", user.last_seen_at);
        const created = formatDateTimeValue("vi", user.created_at);
        const fullName = user.full_name || "(chưa có)";
        const username = user.username ? `@${user.username}` : "(chưa có)";
        const tgLang = user.telegram_language || "(không rõ)";
        const lines = [
          `👤 Thông tin cá nhân`,
          `• ID: ${user.user_id}`,
          `• Tên: ${fullName}`,
          `• Username: ${username}`,
          `• Số dư: ${balance}`,
          `• Ngôn ngữ bot: ${user.language?.toUpperCase()}`,
          `• Ngôn ngữ Telegram: ${tgLang}`,
          `• Tạo lúc: ${created}`,
          `• Hoạt động gần nhất: ${lastSeen}`,
          `• Tổng đơn hàng: ${stats.orderCount}`,
          `• Tổng giao dịch nạp: ${stats.transactionCount}`,
          "",
          "📦 Đơn gần nhất:",
          ...(orders.length
            ? orders.map((order, idx) => `${idx + 1}. ${order.status} • ${formatDateTimeValue("vi", order.created_at)}`)
            : ["(Chưa có đơn)"]),
          "",
          "💳 Giao dịch nạp gần nhất:",
          ...(transactions.length
            ? transactions.map(
                (tran, idx) =>
                  `${idx + 1}. ${currencyWithSymbol("vi", tran.amount)} • ${formatDateTimeValue("vi", tran.created_at)} • ${tran.tran_id}`
              )
            : ["(Chưa có giao dịch)"])
        ];
        return lines.join("\n");
      },
      bankConfigIntro: settings => {
        const minAmount = settings.min_topup ? currencyWithSymbol("vi", settings.min_topup) : "(chưa đặt)";
        return [
          "Cài đặt ngân hàng hiện tại:",
          `• Ngân hàng: ${settings.bank_name || settings.bank_code || "(chưa có)"}`,
          `• Chủ TK: ${settings.account_name || "(chưa có)"}`,
          `• Số TK: ${settings.account_number ? codeTag(settings.account_number) : "(chưa có)"}`,
          `• Số tiền tối thiểu: ${minAmount}`,
          `• Nội dung: ${codeTag((settings.topup_note || "(chưa có)").toUpperCase())}`,
          "Lưu ý: Auto bank chỉ hỗ trợ tài khoản ngân hàng ACB."
        ].join("\n");
      },
      bankFieldPrompt: label => `Nhập ${label} mới:`,
      bankFieldUpdated: label => `${label} đã được lưu.`,
      promptCancelHint: "Nhấn ❌ Hủy thao tác nếu muốn dừng.",
      promptCancelled: "Đã hủy thao tác.",
      depositMissingBankInfo: "Chưa thiết lập đủ thông tin ngân hàng. Vui lòng liên hệ admin để được hỗ trợ.",
      manualCronStart: "Đang kiểm tra giao dịch mới nhất, vui lòng chờ...",
      manualCronDone: "Hệ thống vừa quét giao dịch. Nếu bạn đã chuyển khoản, tiền sẽ được cộng ngay khi phát hiện.",
      manualCronFailed: reason => `Không kiểm tra được giao dịch: ${reason || "Không xác định"}. Vui lòng thử lại sau hoặc liên hệ admin.`,
      manualCronNoMatch: note =>
        `Chưa nhận được giao dịch mới từ bạn hoặc chuyển tiền chưa thành công. Vui lòng kiểm tra lại và bấm "✅ Tôi đã thanh toán". Nội dung cần chuyển: "${note}".`,
      topupSupportAck: "Đã gửi yêu cầu hỗ trợ tới admin. Vui lòng chờ phản hồi.",
      topupSupportNotify: ({ user, note }) => {
        const name = user.full_name || "(không rõ tên)";
        const username = user.username ? `@${user.username}` : "(chưa có username)";
        return `Khách ${name} (${username}, ID ${user.user_id}) cần hỗ trợ nạp tiền. Nội dung chuyển khoản: ${note}.`;
      },
      depositGuide: ({ bankName, bankCode, accountName, accountNumber, note, minAmount, user }) => {
        const minText = minAmount ? currencyWithSymbol("vi", minAmount) : "Không giới hạn";
        const userLines = [];
        if (user?.full_name) {
          userLines.push(`• Khách: ${user.full_name}`);
        }
        if (user?.username) {
          userLines.push(`• Username: @${user.username}`);
        }
        userLines.push(`• ID: ${user?.user_id}`);
        return [
          "Vui lòng chuyển khoản theo thông tin sau:",
          `• Ngân hàng: ${bankName || bankCode}`,
          `• Chủ tài khoản: ${accountName}`,
          `• Số tài khoản: ${codeTag(accountNumber)}`,
          `• Nội dung bắt buộc: ${codeTag(note)}`,
          `• Số tiền tối thiểu: ${minText}`,
          ...userLines,
          "Tiền sẽ được cộng tự động 1-3 phút sau khi hệ thống ghi nhận giao dịch."
        ].join("\n");
      },
      depositQrUnavailable: "Không tạo được mã QR. Vui lòng chuyển khoản thủ công theo thông tin trên.",
      manualAdjustAskUser: "Nhập ID Telegram cần cộng/trừ số dư.",
      manualAdjustUserNotFound: id => `Không tìm thấy người dùng ${id}.`,
      manualAdjustShowUser: ({ user, balance }) =>
        `Đang thao tác với #${user.user_id}\nSố dư hiện tại: ${currencyWithSymbol("vi", balance)}\nChọn hành động:`,
      manualAdjustAskAmount: actionLabel => `Nhập số tiền cần ${actionLabel} (đơn vị VND).`,
      manualAdjustInvalidAmount: "Số tiền không hợp lệ. Vui lòng nhập lại.",
      manualAdjustDone: ({ delta, balance }) => {
        const sign = delta > 0 ? "+" : "-";
        return `Đã cập nhật: ${sign}${currencyWithSymbol("vi", Math.abs(delta))}\nSố dư mới: ${currencyWithSymbol("vi", balance)}.`;
      },
      manualAdjustCancelled: "Đã hủy điều chỉnh số dư.",
      manualAdjustActionLabels: {
        add: "cộng",
        subtract: "trừ"
      },
      autoTopupSuccess: ({ amount, tranId, description, transactionDate }) => {
        const lines = [
          `Hệ thống đã cộng ${currencyWithSymbol("vi", amount)} vào tài khoản của bạn.`,
          `Mã giao dịch: ${tranId}.`
        ];
        if (description) {
          lines.push(`Nội dung: ${description}`);
        }
        if (transactionDate) {
          lines.push(`Thời gian: ${formatDateTimeValue("vi", transactionDate)}.`);
        }
        return lines.join("\n");
      },
      autoTopupNotifyAdmin: ({ userId, amount, tranId, description, transactionDate }) => {
        const lines = [
          `User #${userId} vừa được cộng ${currencyWithSymbol("vi", amount)} (giao dịch ${tranId}).`
        ];
        if (description) {
          lines.push(`Nội dung: ${description}`);
        }
        if (transactionDate) {
          lines.push(`Thời gian: ${formatDateTimeValue("vi", transactionDate)}.`);
        }
        return lines.join("\n");
      },
      manualAdjustNotifyUser: ({ delta, balance }) => {
        const action = delta >= 0 ? "cộng" : "trừ";
        return `Admin đã ${action} ${currencyWithSymbol("vi", Math.abs(delta))}. Số dư mới: ${currencyWithSymbol("vi", balance)}.`;
      },
      manualAdjustNotifyAdmin: ({ adminId, targetId, delta, balance }) => {
        const action = delta >= 0 ? "cộng" : "trừ";
        return `Admin #${adminId} đã ${action} ${currencyWithSymbol("vi", Math.abs(delta))} cho user #${targetId}. Số dư mới: ${currencyWithSymbol("vi", balance)}.`;
      },
      autoBankBankOnlyAcb: "Auto bank chỉ hỗ trợ tài khoản ngân hàng ACB.",
      setupMissing: "Hệ thống chưa có bảng dữ liệu. Bấm \"🧱 Khởi tạo dữ liệu\" để đổ schema mặc định.",
      setupNeedAdmin: "Hệ thống chưa khởi tạo. Vui lòng báo admin bấm \"🧱 Khởi tạo dữ liệu\".",
      setupAlreadyReady: "Hệ thống đã có đầy đủ bảng dữ liệu.",
      setupSuccess: "Đã khởi tạo dữ liệu thành công. Gõ /start để tiếp tục.",
      setupFailed: reason => `Không khởi tạo được dữ liệu: ${reason}`,
      setupManualStart: "Đang đổ dữ liệu mặc định. Vui lòng chờ vài giây..."
    }
  },
  en: {
    code: "en",
    name: "English",
    languageLabel: "🇺🇸 English",
    synonyms: ["en", "english", "tieng anh", "tiếng anh"],
    buttons: {
      buy: "🛒 Buy account",
      balance: "💰 Balance",
      topup: "💳 Top up",
      personal: "👤 Personal",
      personalInfo: "ℹ️ Info",
      personalBalanceChanges: "📈 Balance changes",
      personalOrderHistory: "🧾 Order history",
      personalBack: "⬅️ Back to menu",
      topupConfirm: "✅ I have paid",
      topupBack: "⬅️ Back to menu",
      topupSupport: "🆘 Contact admin",
      import: "⚡ Quick import",
      shopManage: "📦 Product manager",
      settings: "🛠 Admin Panel",
      language: "🌐 Language",
      settingsBack: "⬅️ Close admin panel",
      languageBack: "⬅️ Back",
      ping: "📶 Ping",
      cpu: "🖥 CPU",
      autoBank: "🏦 Auto bank",
      autoBankSet: "🔐 ACB token",
      autoBankTokenEdit: "✏️ Edit token",
      autoBankTokenDelete: "🗑 Delete token",
      autoBankTokenBack: "⬅️ Back to auto bank",
      autoBankHistory: "📜 Transactions",
      autoBankUserInfo: "👥 Customer info",
      customerInfoList: "📋 Chatted users",
      customerInfoCheckById: "🔎 Check by ID",
      customerInfoBack: "⬅️ Back to admin",
      autoBankBankInfo: "🏦 Bank setup",
      autoBankManualAdjust: "💼 Adjust balance",
      autoBankBack: "⬅️ Back",
      adminManage: "🛡 Admins",
      adminAdd: "➕ Add admin",
      adminRemove: "➖ Remove admin",
      adminList: "📋 Admin list",
      adminManageBack: "⬅️ Back to settings",
      bankFieldBank: "🏦 Bank",
      bankFieldAccountName: "👤 Account name",
      bankFieldAccountNumber: "🔢 Account number",
      bankFieldMinAmount: "💵 Min amount",
      bankFieldNote: "📝 Transfer note",
      bankSettingsBack: "⬅️ Back to auto bank",
      setupManual: "🧱 Bootstrap data",
      manualAdd: "➕ Credit",
      manualSubtract: "➖ Debit",
      cancel: "❌ Cancel",
      setupInit: "🧱 Init data"
    },
    texts: {
      greeting: "Welcome!\nUse the menu below to continue.",
      personalIntro: "Personal area:",
      holdSuccess: "Account is reserved for 5 minutes. Pay and send /done when finished.",
      holdFailed: "No available account right now. Please try again later.",
      balance: amount => `Current balance: ${currencyWithSymbol("en", amount)}`,
      importGuide: "Correct format: first line /import, following lines email|password.",
      importDone: count => `${count} accounts imported successfully.`,
      buyGuide: "Tap \"💳 Top up\" to see payment instructions or contact an admin for help.",
      noPermission: "You are not allowed to use this command.",
      unknown: "Request not recognized. Please use the menu.",
      settingsSummary: settings => {
        const admins = (settings.admin_ids || []).join(", ");
        const token = settings.acb_token ? `Configured (${spoilerCodeTag(maskToken(settings.acb_token))})` : "Not set";
        const bank = settings.account_number
          ? `${settings.bank_name || settings.bank_code} • ${codeTag(settings.account_number)}`
          : "Bank info missing";
        return `Admins: ${admins || "(none)"}\nAuto bank: ${token}\nBank: ${bank}`;
      },
      adminMenuIntro: "Admin panel:",
      settingsClosed: "Admin panel closed.",
      backToMenu: "Back to menu.",
      chooseLanguage: "Select the language you want to use:",
      languageUpdated: name => `Language changed to ${name}.`,
      languageSame: name => `${name} is already active.`,
      languageInvalid: "Unable to detect that language. Please choose again.",
      setAcbHint: "Send the new ACB token (auto bank supports ACB only).",
      setAcbSuccess: "ACB token updated successfully.",
      addAdminHint: "Send the Telegram ID of the admin you want to add.",
      addAdminSuccess: id => `Added admin ${id}.`,
      adminManageIntro: "Choose an admin action:",
      adminListEmpty: "No admins have been configured yet.",
      adminListTitle: count => `Admins (${count}):`,
      adminListItem: ({ index, id, isDefault, user }) => {
        const header = `${index}. Admin #${id}${isDefault ? " • (default)" : ""}`;
        if (!user) {
          return `${header}\n   • No user profile found.`;
        }
        const name = user.full_name ? `   • Name: ${user.full_name}` : null;
        const username = user.username ? `   • Username: @${user.username}` : null;
        const balance = currencyWithSymbol("en", user.balance || 0);
        const lang = (user.language || DEFAULT_LANGUAGE).toUpperCase();
        const created = formatDateTimeValue("en", user.created_at);
        const lastSeen = formatDateTimeValue("en", user.last_seen_at);
        return [
          header,
          name,
          username,
          `   • Balance: ${balance}`,
          `   • Language: ${lang}`,
          `   • Created: ${created}`,
          `   • Last seen: ${lastSeen}`
        ]
          .filter(Boolean)
          .join("\n");
      },
      adminRemoveIntro: "Select the admin you want to remove:",
      adminRemoveEmpty: "There are no admins to remove.",
      adminRemoveSuccess: id => `Removed admin ${id}.`,
      adminRemoveDefault: id => `Cannot remove the default admin ${id}.`,
      adminRemoveFailed: id => `Admin ${id} was not found.`,
      adminButtonLabel: entry => {
        const id = typeof entry === "object" ? entry.id : entry;
        const user = typeof entry === "object" ? entry.user : null;
        const name = user?.full_name?.trim() || (user?.username ? `@${user.username}` : null);
        if (name) {
          return `${name} (#${id})`;
        }
        return `Admin #${id}`;
      },
      pingResponse: latency => `Pong! ${latency}ms`,
      cpuInfo: ({ cpuModel, load, usedGb, totalGb, usagePercent }) =>
        `CPU: ${cpuModel}\nLoad (1m): ${load}\nRAM: ${usedGb}/${totalGb} GB (${usagePercent}%)`,
      restartInfo: "The bot runs on Vercel serverless and cannot restart itself. Deploy again to apply changes.",
      languageMenuTitle: "Choose your language:",
      unauthorized: "You are not allowed to use this command.",
      autoBankStatus: settings => {
        const tokenLine = settings?.acb_token
          ? `Auto bank is active (token ${spoilerCodeTag(settings.acb_token)})`
          : "Auto bank is not configured yet.";
        const bankLine = settings?.account_number
          ? `Bank: ${settings.bank_name || settings.bank_code} • ${codeTag(settings.account_number)}`
          : "Bank information is missing.";
        return `${tokenLine}\n${bankLine}\nAuto bank currently supports ACB accounts only.`;
      },
      acbTokenMenuStatus: settings => {
        const tokenLine = settings?.acb_token
          ? `Current token: ${spoilerCodeTag(settings.acb_token)}`
          : "Current token: Not set";
        return `ACB token manager:\n${tokenLine}\nChoose an action below.`;
      },
      acbTokenDeleteSuccess: "ACB token removed.",
      autoBankMissingToken: "Auto bank has no token. Please configure it first.",
      autoBankTestSuccess: count => `ACB connection OK. Received ${count} recent transactions.`,
      autoBankTestFailed: reason => `Unable to test ACB: ${reason || "Unknown"}.`,
      autoBankHistoryTitle: count => `Latest transactions (${count}).`,
      autoBankHistoryEmpty: "The API did not return any transactions.",
      customerInfoIntro: "Customer info:",
      customerInfoListTitle: count => `Users who chatted with the bot (${count}):`,
      customerInfoListEmpty: "No users have chatted with the bot yet.",
      customerInfoListItem: ({ index, user }) => {
        const name = user?.full_name || "(no name)";
        const username = user?.username ? `@${user.username}` : "(no username)";
        const lastSeen = formatDateTimeValue("en", user?.last_seen_at);
        return `${index}. #${user?.user_id} • ${name} • ${username}\n   • Last seen: ${lastSeen}`;
      },
      autoBankHistoryItem: ({ index, tran }) => {
        const amount = currencyWithSymbol("en", tran.amount);
        const type = String(tran.type || "IN").toUpperCase() === "OUT" ? "Debit" : "Credit";
        return `${index}. #${tran.transactionID || tran.id} • ${type} • ${amount}\n└ ${tran.transactionDate || "(unknown date)"} • ${tran.description || "(no description)"}`;
      },
      autoBankHistoryFooter: "Showing at most 5 recent transactions from the API.",
      autoBankUserInfoPrompt: "Send the Telegram ID to inspect (e.g. 74299...).",
      autoBankUserInfoNotFound: id => `User ${id} was not found.`,
      autoBankUserInfoResult: ({ user, stats, transactions, orders }) => {
        const balance = currencyWithSymbol("en", user.balance || 0);
        const lastSeen = formatDateTimeValue("en", user.last_seen_at);
        const created = formatDateTimeValue("en", user.created_at);
        const lines = [
          `👤 User #${user.user_id}`,
          `• Balance: ${balance}`,
          `• Language: ${user.language?.toUpperCase()}`,
          `• Created: ${created}`,
          `• Last seen: ${lastSeen}`,
          `• Orders: ${stats.orderCount}`,
          `• Recorded top-ups: ${stats.transactionCount}`,
          "",
          "📦 Recent orders:",
          ...(orders.length
            ? orders.map((order, idx) => `${idx + 1}. ${order.status} • ${formatDateTimeValue("en", order.created_at)}`)
            : ["(None)"]),
          "",
          "💳 Latest credits:",
          ...(transactions.length
            ? transactions.map((tran, idx) => `${idx + 1}. ${currencyWithSymbol("en", tran.amount)} • ${formatDateTimeValue("en", tran.created_at)} • ${tran.tran_id}`)
            : ["(None)"])
        ];
        return lines.join("\n");
      },
      personalInfoResult: ({ user, stats, transactions, orders }) => {
        const balance = currencyWithSymbol("en", user.balance || 0);
        const lastSeen = formatDateTimeValue("en", user.last_seen_at);
        const created = formatDateTimeValue("en", user.created_at);
        const fullName = user.full_name || "(not set)";
        const username = user.username ? `@${user.username}` : "(not set)";
        const tgLang = user.telegram_language || "(unknown)";
        const lines = [
          `👤 Personal info`,
          `• ID: ${user.user_id}`,
          `• Name: ${fullName}`,
          `• Username: ${username}`,
          `• Balance: ${balance}`,
          `• Bot language: ${user.language?.toUpperCase()}`,
          `• Telegram language: ${tgLang}`,
          `• Created: ${created}`,
          `• Last seen: ${lastSeen}`,
          `• Total orders: ${stats.orderCount}`,
          `• Total top-up records: ${stats.transactionCount}`,
          "",
          "📦 Recent orders:",
          ...(orders.length
            ? orders.map((order, idx) => `${idx + 1}. ${order.status} • ${formatDateTimeValue("en", order.created_at)}`)
            : ["(No orders)"]),
          "",
          "💳 Recent top-ups:",
          ...(transactions.length
            ? transactions.map(
                (tran, idx) =>
                  `${idx + 1}. ${currencyWithSymbol("en", tran.amount)} • ${formatDateTimeValue("en", tran.created_at)} • ${tran.tran_id}`
              )
            : ["(No transactions)"])
        ];
        return lines.join("\n");
      },
      bankConfigIntro: settings => {
        const minAmount = settings.min_topup ? currencyWithSymbol("en", settings.min_topup) : "(not set)";
        return [
          "Current bank settings:",
          `• Bank: ${settings.bank_name || settings.bank_code || "(none)"}`,
          `• Account name: ${settings.account_name || "(none)"}`,
          `• Account number: ${settings.account_number ? codeTag(settings.account_number) : "(none)"}`,
          `• Minimum amount: ${minAmount}`,
          `• Transfer note: ${codeTag((settings.topup_note || "(none)").toUpperCase())}`,
          "Note: Auto bank currently supports ACB only."
        ].join("\n");
      },
      bankFieldPrompt: label => `Send the new ${label}:`,
      bankFieldUpdated: label => `${label} saved successfully.`,
      promptCancelHint: "Tap ❌ Cancel if you want to stop.",
      promptCancelled: "Action cancelled.",
      depositMissingBankInfo: "Bank information is incomplete. Please contact an admin for help.",
      manualCronStart: "Checking the latest transactions, please wait...",
      manualCronDone: "We just pulled the latest transactions. If you've already paid, the credit will show up shortly.",
      manualCronFailed: reason => `Could not fetch transactions: ${reason || "Unknown"}. Please try again or contact an admin.`,
      manualCronNoMatch: note => `We couldn't find a transaction containing "${note}" yet. Please double-check your transfer and tap "✅ I have paid" again afterwards.`,
      topupSupportAck: "We've notified the admins. Please wait for assistance.",
      topupSupportNotify: ({ user, note }) => {
        const name = user.full_name || "(unknown name)";
        const username = user.username ? `@${user.username}` : "(no username)";
        return `User ${name} (${username}, ID ${user.user_id}) requested deposit support. Expected note: ${note}.`;
      },
      depositGuide: ({ bankName, bankCode, accountName, accountNumber, note, minAmount, user }) => {
        const minText = minAmount ? currencyWithSymbol("en", minAmount) : "No minimum";
        const userLines = [];
        if (user?.full_name) {
          userLines.push(`• Customer: ${user.full_name}`);
        }
        if (user?.username) {
          userLines.push(`• Username: @${user.username}`);
        }
        userLines.push(`• User ID: ${user?.user_id}`);
        return [
          "Transfer using the following details:",
          `• Bank: ${bankName || bankCode}`,
          `• Account name: ${accountName}`,
          `• Account number: ${codeTag(accountNumber)}`,
          `• Required note: ${codeTag(note)}`,
          `• Minimum amount: ${minText}`,
          ...userLines,
          "Funds are credited automatically within 1-3 minutes after the transaction is detected."
        ].join("\n");
      },
      depositQrUnavailable: "QR code unavailable. Please transfer manually using the details above.",
      manualAdjustAskUser: "Send the Telegram ID whose balance you want to adjust.",
      manualAdjustUserNotFound: id => `User ${id} was not found.`,
      manualAdjustShowUser: ({ user, balance }) =>
        `Working on #${user.user_id}\nCurrent balance: ${currencyWithSymbol("en", balance)}\nChoose an action:`,
      manualAdjustAskAmount: actionLabel => `Enter the amount to ${actionLabel} (VND).`,
      manualAdjustInvalidAmount: "Invalid amount. Please try again.",
      manualAdjustDone: ({ delta, balance }) => {
        const sign = delta > 0 ? "+" : "-";
        return `Updated: ${sign}${currencyWithSymbol("en", Math.abs(delta))}\nNew balance: ${currencyWithSymbol("en", balance)}.`;
      },
      manualAdjustCancelled: "Balance adjustment cancelled.",
      manualAdjustActionLabels: {
        add: "credit",
        subtract: "debit"
      },
      autoTopupSuccess: ({ amount, tranId, description, transactionDate }) => {
        const lines = [
          `We added ${currencyWithSymbol("en", amount)} to your balance.`,
          `Transaction: ${tranId}.`
        ];
        if (description) {
          lines.push(`Description: ${description}`);
        }
        if (transactionDate) {
          lines.push(`Time: ${formatDateTimeValue("en", transactionDate)}.`);
        }
        return lines.join("\n");
      },
      autoTopupNotifyAdmin: ({ userId, amount, tranId, description, transactionDate }) => {
        const lines = [
          `User #${userId} received ${currencyWithSymbol("en", amount)} (transaction ${tranId}).`
        ];
        if (description) {
          lines.push(`Description: ${description}`);
        }
        if (transactionDate) {
          lines.push(`Time: ${formatDateTimeValue("en", transactionDate)}.`);
        }
        return lines.join("\n");
      },
      manualAdjustNotifyUser: ({ delta, balance }) => {
        const action = delta >= 0 ? "credited" : "debited";
        return `Admin ${action} ${currencyWithSymbol("en", Math.abs(delta))}. New balance: ${currencyWithSymbol("en", balance)}.`;
      },
      manualAdjustNotifyAdmin: ({ adminId, targetId, delta, balance }) => {
        const action = delta >= 0 ? "credited" : "debited";
        return `Admin #${adminId} ${action} ${currencyWithSymbol("en", Math.abs(delta))} for user #${targetId}. New balance: ${currencyWithSymbol("en", balance)}.`;
      },
      autoBankBankOnlyAcb: "Auto bank currently supports ACB accounts only.",
      setupMissing: "Database schema is missing. Tap \"🧱 Init data\" to bootstrap it.",
      setupNeedAdmin: "System is not initialized. Please ask an admin to tap \"🧱 Init data\".",
      setupAlreadyReady: "Database schema is already initialized.",
      setupSuccess: "Database bootstrap completed. Send /start again.",
      setupFailed: reason => `Failed to bootstrap data: ${reason}`,
      setupManualStart: "Bootstrapping default schema now. Please wait a moment..."
    }
  }
};

export const LANGUAGE_CODES = Object.keys(translations);
export const DEFAULT_LANGUAGE = "vi";

export function getLocale(language = DEFAULT_LANGUAGE) {
  return translations[LANGUAGE_CODES.includes(language) ? language : DEFAULT_LANGUAGE];
}

export function getLanguageButtons() {
  return LANGUAGE_CODES.map(code => translations[code].languageLabel);
}

export function detectLanguageSelection(text = "") {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  for (const code of LANGUAGE_CODES) {
    const t = translations[code];
    const candidates = [t.languageLabel, t.name, ...(t.synonyms || [])];
    if (candidates.some(label => label?.trim().toLowerCase() === normalized)) {
      return code;
    }
  }
  return null;
}

export function getLanguageName(code) {
  return translations[code]?.name || translations[DEFAULT_LANGUAGE].name;
}

export function formatCurrency(amount, language = DEFAULT_LANGUAGE) {
  return formatCurrencyValue(language, amount);
}

export function formatDateTime(value, language = DEFAULT_LANGUAGE) {
  return formatDateTimeValue(language, value);
}
