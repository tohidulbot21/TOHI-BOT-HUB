
const fs = require("fs");
const axios = require('axios');

module.exports.config = {
  name: "daily",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "TOHI-BOT-HUB",
  description: "দৈনিক বোনাস নিন",
  commandCategory: "Economy",
  cooldowns: 5,
  envConfig: {
    cooldownTime: 43200000 // 12 hours
  }
};

module.exports.run = async ({ event, api, Currencies }) => {
  const { threadID, messageID, senderID } = event;
  
  try {
    const cooldown = global.configModule[this.config.name].cooldownTime;
    let data = (await Currencies.getData(senderID)).data || {};
    
    // Check cooldown
    if (typeof data !== "undefined" && cooldown - (Date.now() - data.workTime) > 0) {
      const timeLeft = cooldown - (Date.now() - data.workTime);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      return api.sendMessage(
        `⏰ Daily bonus এর জন্য অপেক্ষা করুন!\n` +
        `⌛ সময় বাকি: ${hours}ঘ ${minutes}মি ${seconds}সে`,
        threadID, messageID
      );
    }
    
    // Give daily bonus
    const dailyAmount = 500;
    await Currencies.increaseMoney(senderID, dailyAmount);
    
    // Get random image
    let attachment = null;
    try {
      const res = await axios.get("https://apimyjrt.jrt-official.repl.co/naughty.php");
      const imageUrl = res.data.data;
      const download = (await axios.get(imageUrl, { responseType: "stream" })).data;
      attachment = download;
    } catch (error) {
      // If image fails, continue without image
    }
    
    const successMessage = 
      `💰 Daily Bonus সংগ্রহ করা হয়েছে!\n` +
      `💵 পরিমাণ: ${dailyAmount.toLocaleString()}$\n` +
      `⏰ পরবর্তী bonus: 12 ঘন্টা পরে\n` +
      `🎉 সুখী থাকুন!`;
    
    return api.sendMessage({
      body: successMessage,
      attachment: attachment
    }, threadID, messageID);
    
  } catch (error) {
    console.error("Daily command error:", error);
    return api.sendMessage(
      "❌ একটি ত্রুটি ঘটেছে। পরে আবার চেষ্টা করুন।",
      threadID, messageID
    );
  }
};
