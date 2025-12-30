// src/constants.js

// Ưu tiên lấy từ biến môi trường (VITE_...), nếu không có thì dùng ID mặc định
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || "0x1866265bdabf20bfab7f28f48f2c475ad4aba0f4eec379dc0f167192ca36dd5c";

export const ADMIN_CAP_ID = import.meta.env.VITE_ADMIN_CAP_ID || "0x0024ff7e512ffea1b6ba88c19f601148b8c86f22adc88be9fbb0bcf9f9f8b864";

export const GLOBAL_CONFIG_ID = import.meta.env.VITE_GLOBAL_CONFIG_ID || "0xac6ae706beabc8a79e1c5d1cdf536749f5a6452c4df6ddb9e600c1378578b95d";

export const DISPLAY_ID = import.meta.env.VITE_DISPLAY_ID || "0x38a3ac8489d5f65124e17d2713f63c257ef854794792c9b43e65f05741932a0f";

export const MODULE_NAME = "charity_impact_protocol";

// CLOCK_ID là mặc định của hệ thống Sui nên để cố định 0x6 luôn cũng được
export const CLOCK_ID = "0x6";