// src/constants.js

// Lấy từ Environment Variables trên Railway, nếu không có thì dùng giá trị mặc định
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || "0x1866265bdabf20bfab7f28f48f2c475ad4aba0f4eec379dc0f167192ca36dd5c";

export const ADMIN_CAP_ID = import.meta.env.VITE_ADMIN_CAP_ID || "0x0024ff7e512ffea1b6ba88c19f601148b8c86f22adc88be9fbb0bcf9f9f8b864";

export const GLOBAL_CONFIG_ID = import.meta.env.VITE_GLOBAL_CONFIG_ID || "0xac6ae706beabc8a79e1c5d1cdf536749f5a6452c4df6ddb9e600c1378578b95d";

export const MODULE_NAME = "charity_impact_protocol";
export const CLOCK_ID = "0x6";