
const fs = require('fs');
const axios = require("axios");
const { resolve } = require('path');

// Multiple API endpoints for better reliability and speed
const API_ENDPOINTS = [
  "https://apis.shresthatamang.com.np/ytdl?url=",
  "https://youtube-scraper-2023.p.rapidapi.com/video/",
  "https://ytdl-api.vercel.app/api/download?url="
];

// Enhanced download function with multiple API fallbacks
async function downloadMusicFromYoutube(link, path) {
  const timestart = Date.now();
  
  if (!link) return Promise.reject('Link Not Found');

  // Try multiple APIs for better success rate
  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    try {
      console.log(`[SONG] Trying API endpoint ${i + 1}/${API_ENDPOINTS.length}`);
      
      let audioUrl, title;
      
      if (i === 0) {
        // Primary fast API
        const response = await axios.get(`${API_ENDPOINTS[i]}${encodeURIComponent(link)}`, {
          timeout: 15000
        });
        audioUrl = response.data.audio?.url || response.data.downloadUrl;
        title = response.data.title;
      } else if (i === 1) {
        // Secondary API
        const videoId = link.split('v=')[1]?.split('&')[0] || link.split('/').pop();
        const response = await axios.get(`${API_ENDPOINTS[i]}${videoId}`, {
          headers: {
            'X-RapidAPI-Key': 'your-rapidapi-key', // You can add your key here
            'X-RapidAPI-Host': 'youtube-scraper-2023.p.rapidapi.com'
          },
          timeout: 15000
        });
        audioUrl = response.data.audio_formats?.[0]?.url;
        title = response.data.title;
      } else {
        // Fallback API
        const response = await axios.get(`${API_ENDPOINTS[i]}${encodeURIComponent(link)}`, {
          timeout: 15000
        });
        audioUrl = response.data.audioUrl || response.data.url;
        title = response.data.title;
      }

      if (!audioUrl) continue;

      // Download with progress tracking
      return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(path);
        
        axios({
          method: 'get',
          url: audioUrl,
          responseType: 'stream',
          timeout: 30000,
          maxRedirects: 5
        }).then(response => {
          const totalLength = response.headers['content-length'];
          let downloadedLength = 0;
          
          response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            if (totalLength) {
              const progress = Math.round((downloadedLength / totalLength) * 100);
              if (progress % 25 === 0) { // Log every 25%
                console.log(`[SONG] Download progress: ${progress}%`);
              }
            }
          });

          response.data.pipe(writer);
          
          writer.on('finish', () => {
            resolve({
              title: title || 'Unknown Title',
              timestart: timestart,
              apiUsed: i + 1
            });
          });
          
          writer.on('error', reject);
        }).catch(reject);
      });
      
    } catch (error) {
      console.log(`[SONG] API ${i + 1} failed:`, error.message);
      if (i === API_ENDPOINTS.length - 1) {
        return Promise.reject(error);
      }
      continue;
    }
  }
  
  return Promise.reject(new Error('All API endpoints failed'));
}

// Enhanced YouTube search with better results
async function searchYouTube(query, maxResults = 6) {
  try {
    const Youtube = require('youtube-search-api');
    const searchResults = await Youtube.GetListByKeyword(query, false, maxResults);
    
    return searchResults.items.map(item => ({
      id: item.id,
      title: item.title,
      duration: item.length?.simpleText || 'Unknown',
      channel: item.channelTitle || 'Unknown Channel',
      thumbnail: item.thumbnail?.thumbnails?.[0]?.url
    }));
  } catch (error) {
    // Fallback to alternative search method
    try {
      const response = await axios.get(`https://youtube-search-api.vercel.app/api/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
      return response.data.items || [];
    } catch (fallbackError) {
      throw new Error('Search functionality unavailable');
    }
  }
}

module.exports.config = {
  name: "song", 
  version: "2.0.0", 
  permission: 0,
  credits: "TOHI-BOT-HUB",
  description: "Advanced YouTube music downloader with multiple API support",
  usePrefix: true,
  commandCategory: "media", 
  usages: "[song name] or [youtube link]", 
  cooldowns: 3 // Reduced cooldown for better UX
};

module.exports.handleReply = async function ({ api, event, handleReply }) {
  const { createReadStream, unlinkSync, statSync } = require("fs-extra");
  
  try {
    const choice = parseInt(event.body);
    if (isNaN(choice) || choice < 1 || choice > handleReply.link.length) {
      return api.sendMessage('❌ Invalid selection! Please choose a number from the list.', event.threadID, event.messageID);
    }

    const selectedVideo = handleReply.link[choice - 1];
    const path = `${__dirname}/cache/song_${event.senderID}_${Date.now()}.mp3`;
    
    // Send processing message
    const processingMsg = await api.sendMessage('🎵 Processing your request... Please wait!', event.threadID);
    
    try {
      const data = await downloadMusicFromYoutube(`https://www.youtube.com/watch?v=${selectedVideo.id}`, path);
      
      // Check file size (25MB limit)
      if (fs.statSync(path).size > 26214400) {
        fs.unlinkSync(path);
        api.unsendMessage(processingMsg.messageID);
        return api.sendMessage('❌ File too large! Please choose a shorter song (max 25MB).', event.threadID, event.messageID);
      }

      // Unsend processing message and send result
      api.unsendMessage(processingMsg.messageID);
      api.unsendMessage(handleReply.messageID);
      
      return api.sendMessage({ 
        body: `🎵 **${data.title}**\n` +
              `⏱️ Processing time: ${Math.floor((Date.now() - data.timestart)/1000)}s\n` +
              `🔗 API used: ${data.apiUsed}/${API_ENDPOINTS.length}\n` +
              `💿 ====TOHI-BOT-HUB====💿`,
        attachment: fs.createReadStream(path)
      }, event.threadID, () => fs.unlinkSync(path), event.messageID);
      
    } catch (error) {
      api.unsendMessage(processingMsg.messageID);
      console.error('[SONG] Download error:', error);
      return api.sendMessage('❌ Download failed! Please try another song or check the link.', event.threadID, event.messageID);
    }
    
  } catch (error) {
    console.error('[SONG] HandleReply error:', error);
    return api.sendMessage('❌ An error occurred while processing your request.', event.threadID, event.messageID);
  }
}

module.exports.convertHMS = function(value) {
  const sec = parseInt(value, 10); 
  let hours = Math.floor(sec / 3600);
  let minutes = Math.floor((sec - (hours * 3600)) / 60); 
  let seconds = sec - (hours * 3600) - (minutes * 60); 
  
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;
  if (seconds < 10) seconds = "0" + seconds;
  
  return (hours != '00' ? hours + ':' : '') + minutes + ':' + seconds;
}

module.exports.run = async function ({ api, event, args }) {
  if (args.length == 0 || !args) {
    return api.sendMessage('🎵 **TOHI-BOT Song Downloader**\n\n' +
                          '📝 Usage:\n' +
                          '• `/song [song name]` - Search and download\n' +
                          '• `/song [youtube link]` - Direct download\n\n' +
                          '💡 Example: `/song shape of you ed sheeran`', 
                          event.threadID, event.messageID);
  }

  const keywordSearch = args.join(" ");
  const path = `${__dirname}/cache/song_${event.senderID}_${Date.now()}.mp3`;
  
  // Clean up any existing files for this user
  const cacheDir = `${__dirname}/cache/`;
  if (fs.existsSync(cacheDir)) {
    const existingFiles = fs.readdirSync(cacheDir).filter(file => 
      file.startsWith(`song_${event.senderID}_`) && file.endsWith('.mp3')
    );
    existingFiles.forEach(file => {
      try {
        fs.unlinkSync(`${cacheDir}${file}`);
      } catch (e) { /* ignore */ }
    });
  }

  // Direct YouTube link processing
  if (keywordSearch.includes("youtube.com/watch") || keywordSearch.includes("youtu.be/")) {
    const processingMsg = await api.sendMessage('🎵 Processing YouTube link... Please wait!', event.threadID);
    
    try {
      const data = await downloadMusicFromYoutube(keywordSearch, path);
      
      if (fs.statSync(path).size > 26214400) {
        fs.unlinkSync(path);
        api.unsendMessage(processingMsg.messageID);
        return api.sendMessage('❌ File too large! Please try a shorter video (max 25MB).', event.threadID, event.messageID);
      }
      
      api.unsendMessage(processingMsg.messageID);
      return api.sendMessage({ 
        body: `🎵 **${data.title}**\n` +
              `⏱️ Processing time: ${Math.floor((Date.now() - data.timestart)/1000)}s\n` +
              `🔗 API used: ${data.apiUsed}/${API_ENDPOINTS.length}\n` +
              `💿 ====TOHI-BOT-HUB====💿`,
        attachment: fs.createReadStream(path)
      }, event.threadID, () => fs.unlinkSync(path), event.messageID);
      
    } catch (error) {
      api.unsendMessage(processingMsg.messageID);
      console.error('[SONG] Direct download error:', error);
      return api.sendMessage('❌ Failed to download from YouTube link! Please check the URL.', event.threadID, event.messageID);
    }
  } 
  // Search functionality
  else {
    const searchMsg = await api.sendMessage('🔍 Searching for songs... Please wait!', event.threadID);
    
    try {
      const searchResults = await searchYouTube(keywordSearch, 6);
      
      if (searchResults.length === 0) {
        api.unsendMessage(searchMsg.messageID);
        return api.sendMessage(`❌ No results found for: "${keywordSearch}"\n\n💡 Try different keywords or check spelling.`, 
                              event.threadID, event.messageID);
      }

      let msg = `🔍 **Found ${searchResults.length} results for: "${keywordSearch}"**\n\n`;
      
      searchResults.forEach((result, index) => {
        msg += `**${index + 1}.** ${result.title}\n`;
        msg += `   ⏱️ ${result.duration} | 📺 ${result.channel}\n\n`;
      });
      
      msg += '📝 **Reply with a number (1-6) to download**';
      
      api.unsendMessage(searchMsg.messageID);
      return api.sendMessage(msg, event.threadID, (error, info) => {
        if (!error) {
          global.client.handleReply.push({
            type: 'reply',
            name: this.config.name,
            messageID: info.messageID,
            author: event.senderID,
            link: searchResults
          });
        }
      }, event.messageID);
      
    } catch (error) {
      api.unsendMessage(searchMsg.messageID);
      console.error('[SONG] Search error:', error);
      return api.sendMessage('❌ Search failed! Please try again with different keywords.', event.threadID, event.messageID);
    }
  }
}
