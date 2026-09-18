/**
 * Reactive Internationalization (I18n) Engine
 * Bali BagMove — "Enjoy Bali, Luggage-Free."
 * Supported Languages: English (en) & Chinese / 简体中文 (zh)
 */

import { reactive, computed } from 'vue';

const STORAGE_KEY = 'balibagmove_locale';

const savedLocale = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
export const currentLocale = reactive({
  lang: savedLocale === 'zh' ? 'zh' : 'en', // default English
});

export function setLocale(lang) {
  if (lang === 'zh' || lang === 'en') {
    currentLocale.lang = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
  }
}

export const translations = {
  en: {
    // Brand
    brandName: "Bali BagMove",
    brandTagline: "Enjoy Bali, Luggage-Free.",
    dpsZonesBadge: "DPS 85 Zones",
    
    // Navbar
    navPricelist: "Pricelist & Calculator",
    navTrack: "Track Luggage",
    navBranchOps: "Branch Ops",
    navSuperAdmin: "Super Admin",
    waCenter: "WA Center",
    switchRole: "Switch Role Mode",
    testRoleDesc: "Test role permissions live",
    allLogins: "All Logins",
    resetCustomer: "Reset Customer",
    
    // Hero
    heroHeadline1: "Your Bags to the Hotel,",
    heroHeadline2: "You Explore Bali Hands-Free!",
    heroSubtitle: "Official luggage delivery & storage direct from Ngurah Rai Airport (DPS) to 85 hotel & villa destinations across Bali.",
    trustRating: "4.9/5 Rating",
    trustReviews: "(1,480+ Travelers)",
    trustSeals: "100% Numbered Security Seals",
    trustPhoto: "WhatsApp Photo Proof",
    trustResponse: "24/7 Fast Response",

    // Step 1: Route & Destination
    step1Title: "1. Select Route & Destination",
    routeAirportToHotel: "Airport ➔ Hotel",
    routeHotelToAirport: "Hotel ➔ Airport",
    routeHotelToHotel: "Hotel ➔ Hotel",
    popularQuickSelect: "Popular Destinations (1-Click):",
    searchLabel: "Or search from all 85 Bali locations:",
    searchPlaceholder: "Type location name (e.g. Bedugul, Kintamani, Lovina, Tanah Lot)...",
    browseAllOpen: "Browse All 85 Locations ▼",
    browseAllClose: "Close List ▲",

    // Step 2: Luggage Quantity
    step2Title: "2. Luggage Quantity",
    howManyBags: "How many bags?",
    bagsCountLabel: "Bags",
    flatBundleIncluded: "1–2 Bags included in the flat fare bundle.",
    extraBagFeeNotice: "extra @ IDR 30,000 / bag",

    // Step 3: Traveler Details
    step3Title: "3. Traveler Details & Schedule",
    guestNameLabel: "Guest Full Name",
    guestNamePlaceholder: "e.g. Alex Lee",
    phoneLabel: "WhatsApp / Phone Number",
    phonePlaceholder: "+61 / +65 / +86 / +62...",
    flightNoLabel: "Flight Number (Optional)",
    flightNoPlaceholder: "e.g. SQ 944 / GA 402 / QF 43",
    hotelPickupLabel: "Pickup Hotel / Villa Name",
    hotelPickupPlaceholder: "Hotel / Villa Name",
    datetimeLabel: "Pickup Date & Time",

    // Invoice Summary
    summaryTitle: "Fare Calculation Summary",
    summaryBadge: "Transparent Flat Fare",
    destinationLabel: "Destination:",
    distanceLabel: "Distance:",
    fromDPSAirport: "from DPS Airport",
    baseFareLabel: "Flat Base Fare (1–2 Bags):",
    extraBagsLabel: "Extra Bags",
    totalPaymentLabel: "Total Payment",
    estFXLabel: "Est. FX:",
    btnBookWhatsApp: "Book via WhatsApp (5-Min Response)",
    btnCopySummary: "Copy Summary",
    btnCopied: "Copied!",
    btnPayOnline: "Pay Online",
    guaranteePayHandover: "Pay upon luggage handover",
    guaranteeSealsAttached: "Tamper-proof seals attached",
    conciergeTitle: "WhatsApp Concierge Team",
    chatCS: "Chat CS ➔",

    // Social Proof
    socialBadge: "Real Traveler Experiences",
    socialTitle: "Trusted by Over 1,400+ Bali Travelers",
    socialSubtitle: "See what international tourists say about their luggage-free vacation with Bali BagMove.",

    // FAQ
    faqTitle: "Frequently Asked Questions (FAQ)",
    faqSubtitle: "Everything you need to know about Bali BagMove services",

    // Mobile Bottom Bar
    mobileTotalLabel: "Total",
    mobileBookBtn: "Book via WhatsApp",

    // Tracking View
    trackTitle: "Live Luggage Tracking",
    trackSubtitle: "Enter your Bali BagMove Booking Code to track real-time delivery status, courier info, and photo proof.",
    trackPlaceholder: "e.g. BT-20260812-7891",
    trackButton: "Track",
    tryDemo: "Try Demo:",
    bookingNotFound: "Booking Not Found",
    bookingNotFoundDesc: "No booking matched your search. Please double check your booking code from your confirmation WhatsApp message.",
    statusConfirmed: "Confirmed",
    statusAssigned: "Courier Assigned",
    statusPickedUp: "Picked Up",
    statusInTransit: "In Transit",
    statusDelivered: "Delivered",
    assignedCourierTitle: "Assigned Courier & Vehicle",
    verifiedDriver: "Verified Driver",
    proofPhotoTitle: "Verified Luggage Proof Photos",
    tamperSealsTag: "Tamper-Proof Seals",
    eventLogTitle: "Event & WhatsApp Notification Log",
    waDispatched: "WhatsApp Sent",
  },

  zh: {
    // Brand
    brandName: "Bali BagMove",
    brandTagline: "轻松游巴厘，行李无忧。",
    dpsZonesBadge: "DPS 85个配送区",
    
    // Navbar
    navPricelist: "价格与计算器",
    navTrack: "行李实时追踪",
    navBranchOps: "网点运营中心",
    navSuperAdmin: "超级管理员",
    waCenter: "微信 / 客服中心",
    switchRole: "切换角色模式",
    testRoleDesc: "实时测试角色权限与隔离",
    allLogins: "所有登录账号",
    resetCustomer: "重置为游客",
    
    // Hero
    heroHeadline1: "行李直达酒店，",
    heroHeadline2: "您轻松畅游巴厘岛！",
    heroSubtitle: "官方行李直运与寄存服务，从伍拉·赖国际机场 (DPS) 直接运送至巴厘岛全境 85 个酒店及别墅区。",
    trustRating: "4.9/5 极高好评",
    trustReviews: "(1,480+ 全球游客)",
    trustSeals: "100% 编号防篡改封条",
    trustPhoto: "WhatsApp/微信 拍照凭证",
    trustResponse: "24/7 全天候快速响应",

    // Step 1: Route & Destination
    step1Title: "1. 选择路线与目的地",
    routeAirportToHotel: "机场 ➔ 酒店",
    routeHotelToAirport: "酒店 ➔ 机场",
    routeHotelToHotel: "酒店 ➔ 酒店",
    popularQuickSelect: "热门目的地 (一键快捷选择):",
    searchLabel: "或搜索巴厘岛全境 85 个地点:",
    searchPlaceholder: "输入地点名称 (如：苍谷、金塔马尼、罗威纳、海神庙)...",
    browseAllOpen: "浏览全部 85 个地点 ▼",
    browseAllClose: "收起列表 ▲",

    // Step 2: Luggage Quantity
    step2Title: "2. 行李数量",
    howManyBags: "需要运送几件行李？",
    bagsCountLabel: "件行李",
    flatBundleIncluded: "基础一口价套餐已包含 1–2 件行李。",
    extraBagFeeNotice: "超出部分每件 +IDR 30,000 (约 ¥13)",

    // Step 3: Traveler Details
    step3Title: "3. 游客信息与取件时间",
    guestNameLabel: "游客姓名",
    guestNamePlaceholder: "例：张伟 / Alex Lee",
    phoneLabel: "联系电话 / WhatsApp / 微信",
    phonePlaceholder: "+86 / +852 / +65 / +61...",
    flightNoLabel: "航班号 (可选)",
    flightNoPlaceholder: "例：MU 781 / CZ 625 / SQ 944",
    hotelPickupLabel: "取件酒店 / 别墅名称",
    hotelPickupPlaceholder: "酒店或别墅名称",
    datetimeLabel: "取件日期与时间",

    // Invoice Summary
    summaryTitle: "费用计算明细",
    summaryBadge: "透明一口价 (无隐形消费)",
    destinationLabel: "目的地:",
    distanceLabel: "运送距离:",
    fromDPSAirport: "距机场 DPS",
    baseFareLabel: "基础一口价 (含1–2件):",
    extraBagsLabel: "额外行李",
    totalPaymentLabel: "总应付费用",
    estFXLabel: "参考外币:",
    btnBookWhatsApp: "通过 WhatsApp / 客服一键预订 (5分钟响应)",
    btnCopySummary: "复制预订信息",
    btnCopied: "已复制信息！",
    btnPayOnline: "在线支付 (支持支付宝/微信)",
    guaranteePayHandover: "支持现场/货到付款",
    guaranteeSealsAttached: "施加独家防篡改封条",
    conciergeTitle: "管家客服团队",
    chatCS: "联系客服 ➔",

    // Social Proof
    socialBadge: "真实游客体验评价",
    socialTitle: "超过 1,400+ 位巴厘岛游客的信赖之选",
    socialSubtitle: "看看来自全球的游客如何评价 Bali BagMove 的无行李轻松假期。",

    // FAQ
    faqTitle: "常见问题解答 (FAQ)",
    faqSubtitle: "关于 Bali BagMove 行李服务您需要了解的一切",

    // Mobile Bottom Bar
    mobileTotalLabel: "总计",
    mobileBookBtn: "一键预订",

    // Tracking View
    trackTitle: "行李实时状态追踪",
    trackSubtitle: "输入您的 Bali BagMove 预订编号，查看实时配送进度、司机信息与交付照片凭证。",
    trackPlaceholder: "例：BT-20260812-7891",
    trackButton: "查询追踪",
    tryDemo: "示例编号:",
    bookingNotFound: "未找到相关预订",
    bookingNotFoundDesc: "未找到与您搜索匹配的预订。请仔细核对您 WhatsApp 确认信息中的预订编号。",
    statusConfirmed: "已确认预订",
    statusAssigned: "已安排司机",
    statusPickedUp: "已完成取件",
    statusInTransit: "行李运送中",
    statusDelivered: "已安全送达",
    assignedCourierTitle: "负责司机与车辆信息",
    verifiedDriver: "官方认证司机",
    proofPhotoTitle: "照片凭证与防篡改封条",
    tamperSealsTag: "一次性编号安全封条",
    eventLogTitle: "实时日志与通知记录",
    waDispatched: "通知已发送",
  }
};

/**
 * Translation helper function
 */
export function t(key) {
  const lang = currentLocale.lang;
  return translations[lang]?.[key] || translations.en[key] || key;
}
