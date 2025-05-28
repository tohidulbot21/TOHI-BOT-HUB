const fs = require("fs-extra");
const path = require('path');
const { join } = require('path');
const { execSync, spawn } = require('child_process');
const config = require("./config.json");
const listPackage = JSON.parse(fs.readFileSync('./package.json')).dependencies;
const login = require('./includes/login');
const moment = require("moment-timezone");
const logger = require("./utils/log.js");
const chalk = require("chalk");
const pkg = require('./package.json');

console.log(chalk.bold.dim(` TOHI-BOT-HUB`.toUpperCase() + `(v${pkg.version})`));
logger.log(`Getting Started!`, "STARTER");

global.utils = require("./utils");
global.loading = require("./utils/log.js");
global.nodemodule = new Object();
global.config = new Object();
global.configModule = new Object();
global.moduleData = new Array();
global.language = new Object();
global.account = new Object();

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// Initialize web server for performance monitoring
const WebServer = require('./web-server');
const webServer = new WebServer();
webServer.start(5000);

function startProject() {
    try {
        const child = spawn("node", ["--trace-warnings", "--async-stack-traces", "--max-old-space-size=1024", "index.js"], {
            cwd: __dirname,
            stdio: "inherit",
            shell: true
        });

        child.on("close", (codeExit) => {
            if (codeExit !== 0) {
                startProject();
            }
        });

        child.on("error", (error) => {
            console.log(chalk.yellow(``), `An error occurred while starting the child process: ${error}`);
        });
    } catch (error) {
        console.error("An error occurred:", error);
    }
} 

startProject();

global.client = new Object({
  commands: new Map(),
  events: new Map(),
  cooldowns: new Map(),
  eventRegistered: new Array(),
  handleSchedule: new Array(),
  handleReaction: new Array(),
  handleReply: new Array(),
  mainPath: process.cwd(),
  configPath: new String(),
  getTime: function(option) {
    switch (option) {
      case "seconds":
        return `${moment.tz("Asia/Manila").format("ss")}`;
      case "minutes":
        return `${moment.tz("Asia/Manila").format("mm")}`;
      case "hours":
        return `${moment.tz("Asia/Manila").format("HH")}`;
      case "date":
        return `${moment.tz("Asia/Manila").format("DD")}`;
      case "month":
        return `${moment.tz("Asia/Manila").format("MM")}`;
      case "year":
        return `${moment.tz("Asia/Manila").format("YYYY")}`;
      case "fullHour":
        return `${moment.tz("Asia/Manila").format("HH:mm:ss")}`;
      case "fullYear":
        return `${moment.tz("Asia/Manila").format("DD/MM/YYYY")}`;
      case "fullTime":
        return `${moment.tz("Asia/Manila").format("HH:mm:ss DD/MM/YYYY")}`;
    }
  },
  timeStart: Date.now()
});

global.data = new Object({
  threadInfo: new Map(),
  threadData: new Map(),
  userName: new Map(),
  userBanned: new Map(),
  threadBanned: new Map(),
  commandBanned: new Map(),
  threadAllowNSFW: new Array(),
  allUserID: new Array(),
  allCurrenciesID: new Array(),
  allThreadID: new Array()
});

// ────────────────── //
// -- LOAD THEMES -- //
const { getThemeColors } = require("./utils/log");
const { main, secondary, tertiary, html } = getThemeColors();
try {
  const themePath = './includes/cover/html.json';
  let themeData;
  
  if (fs.existsSync(themePath)) {
    const rawData = fs.readFileSync(themePath, 'utf8');
    
    if (rawData.trim() === '' || rawData.trim() === '{}') {
      themeData = null; // Will create default theme
    } else {
      try {
        themeData = JSON.parse(rawData);
        // Validate structure
        if (!themeData || typeof themeData !== 'object' || !themeData.THEME_COLOR) {
          themeData = null; // Invalid structure, create default
        }
      } catch (parseErr) {
        console.error('Error parsing html.json:', parseErr);
        themeData = null; // Parse error, create default
      }
    }
  } else {
    themeData = null; // File doesn't exist, create default
  }
  
  if (!themeData) {
    // Create default theme
    const defaultTheme = {
      THEME_COLOR: html || "#1702CF",
      primary: "#1702CF",
      secondary: "#11019F",
      tertiary: "#1401BF",
      background: "#000000",
      text: "#ffffff",
      accent: "#1702CF"
    };
    fs.writeFileSync(themePath, JSON.stringify(defaultTheme, null, 2));
    console.log('Created default theme file');
  } else {
    // Ensure all required properties exist
    const validTheme = {
      THEME_COLOR: themeData.THEME_COLOR || html || "#1702CF",
      primary: themeData.primary || "#1702CF",
      secondary: themeData.secondary || "#11019F",
      tertiary: themeData.tertiary || "#1401BF",
      background: themeData.background || "#000000",
      text: themeData.text || "#ffffff",
      accent: themeData.accent || html || "#1702CF"
    };
    fs.writeFileSync(themePath, JSON.stringify(validTheme, null, 2));
    console.log('Updated theme file with valid structure');
  }
} catch (error) {
  console.error('Critical error in theme handling:', error);
  // Final fallback - create basic theme
  const fallbackTheme = {
    THEME_COLOR: "#1702CF",
    primary: "#1702CF",
    secondary: "#11019F",
    tertiary: "#1401BF",
    background: "#000000",
    text: "#ffffff",
    accent: "#1702CF"
  };
  fs.writeFileSync('./includes/cover/html.json', JSON.stringify(fallbackTheme, null, 2));
}
// ────────────────── //

const errorMessages = [];
if (errorMessages.length > 0) {
  console.log("Commands with errors:");
  errorMessages.forEach(({ command, error }) => {
    console.log(`${command}: ${error}`);
  });
}
// ────────────────── //
var configValue;
try {
  global.client.configPath = path.join(global.client.mainPath, "config.json");
  configValue = require(global.client.configPath);
  logger.loader("Found config.json file!");
} catch (e) {
  return logger.loader('"config.json" file not found."', "error");
}

try {
  for (const key in configValue) global.config[key] = configValue[key];
  logger.loader("Config Loaded!");
} catch (e) {
  return logger.loader("Can't load file config!", "error")
}

for (const property in listPackage) {
  try {
    global.nodemodule[property] = require(property)
  } catch (e) { }
}
const langFile = (fs.readFileSync(`${__dirname}/languages/${global.config.language || "en"}.lang`, {
  encoding: 'utf-8'
})).split(/\r?\n|\r/);
const langData = langFile.filter(item => item.indexOf('#') != 0 && item != '');
for (const item of langData) {
  const getSeparator = item.indexOf('=');
  const itemKey = item.slice(0, getSeparator);
  const itemValue = item.slice(getSeparator + 1, item.length);
  const head = itemKey.slice(0, itemKey.indexOf('.'));
  const key = itemKey.replace(head + '.', '');
  const value = itemValue.replace(/\\n/gi, '\n');
  if (typeof global.language[head] == "undefined") global.language[head] = new Object();
  global.language[head][key] = value;
}

global.getText = function(...args) {
  const langText = global.language;
  if (!langText.hasOwnProperty(args[0])) {
    throw new Error(`${__filename} - Not found key language: ${args[0]}`);
  }
  var text = langText[args[0]][args[1]];
  if (typeof text === 'undefined') {
    throw new Error(`${__filename} - Not found key text: ${args[1]}`);
  }
  for (var i = args.length - 1; i > 0; i--) {
    const regEx = RegExp(`%${i}`, 'g');
    text = text.replace(regEx, args[i + 1]);
  }
  return text;
};

try {
  var appStateFile = path.resolve(path.join(global.client.mainPath, config.APPSTATEPATH || "appstate.json"));
  var appState = ((process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER) && (fs.readFileSync(appStateFile, 'utf8'))[0] != "[" && config.encryptSt) ? JSON.parse(global.utils.decryptState(fs.readFileSync(appStateFile, 'utf8'), (process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER))) : require(appStateFile);
  logger.loader("Found the bot's appstate.")
} catch (e) {
  logger.loader("Can't find the bot's appstate.", "error");
 // return;
}

function onBot() {
  let loginData = { appState: appState };
  login(loginData, async (err, api) => {
    let getTheInfo = api;
    if (err) {
      if (err.error == 'Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify.') {
        console.log(err.error)
        process.exit(0)
      } else {
        console.log(err)
        return process.exit(0)
      }
    }
    const custom = require('./custom');
    custom({ api });
    const fbstate = api.getAppState();
    api.setOptions(global.config.FCAOption);
      fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()));
    let d = api.getAppState();
    d = JSON.stringify(d, null, '\x09');
    const raw = {
      con: (datr, typ) => api.setPostReaction(datr, typ, () => {}),
      trs:{ getTheInfo },
    };
    if ((process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER) && global.config.encryptSt) {
      d = await global.utils.encryptState(d, process.env.REPL_OWNER || process.env.PROCESSOR_IDENTIFIER);
      fs.writeFileSync(appStateFile, d)
    } else {
      fs.writeFileSync(appStateFile, d)
    }
    global.account.cookie = fbstate.map(i => i = i.key + "=" + i.value).join(";");
    global.client.api = api
    global.config.version = config.version,
      (async () => {
        const commandsPath = `${global.client.mainPath}/modules/commands`;
        const listCommand = fs.readdirSync(commandsPath).filter(command => command.endsWith('.js') && !command.includes('example') && !global.config.commandDisabled.includes(command));
        console.log(tertiary(`\n` + `──LOADING COMMANDS─●`));
        for (const command of listCommand) {
          try {
            const module = require(`${commandsPath}/${command}`);
            const { config } = module;

            if (!config?.name) {
              try {
                throw new Error(`[ COMMAND ] ${command} command has no name property or empty!`);
              } catch (error) {
                console.log(chalk.red(error.message));
                continue;
              }
            }
            if (!config?.commandCategory) {
              try {
                throw new Error(`[ COMMAND ] ${command} commandCategory is empty!`);
              } catch (error) {
                console.log(chalk.red(error.message));
                continue;
              }
            }

            if (!config?.hasOwnProperty('usePrefix')) {
              console.log(`Command`, chalk.hex("#ff0000")(command) + ` does not have the "usePrefix" property.`);
              continue;
            }

            if (global.client.commands.has(config.name || '')) {
              console.log(chalk.red(`[ COMMAND ] ${chalk.hex("#FFFF00")(command)} Module is already loaded!`));
              continue;
            }
            const { dependencies, envConfig } = config;
            if (dependencies) {
              const builtinModules = ['fs', 'path', 'http', 'https', 'url', 'crypto', 'util', 'os', 'child_process', 'stream', 'events', 'buffer', 'querystring', 'zlib'];
              Object.entries(dependencies).forEach(([reqDependency, _]) => {
                if (listPackage[reqDependency] || builtinModules.includes(reqDependency)) return;

                  try {
                    execSync(`npm --package-lock false --save install ${reqDependency}`, {
                      stdio: 'inherit',
                      env: process.env,
                      shell: true,
                      cwd: join(__dirname, 'node_modules')
                    });
                    require.cache = {};
                  } catch (error) {
                    const errorMessage = `[PACKAGE] Failed to install package ${reqDependency} for module`;
                    global.loading.err(chalk.hex('#ff7100')(errorMessage), 'LOADED');
                  }
              });
            }

            if (envConfig) {
              const moduleName = config.name;
              global.configModule[moduleName] = global.configModule[moduleName] || {};
              global.config[moduleName] = global.config[moduleName] || {};
              for (const envConfigKey in envConfig) {
                global.configModule[moduleName][envConfigKey] = global.config[moduleName][envConfigKey] ?? envConfig[envConfigKey];
                global.config[moduleName][envConfigKey] = global.config[moduleName][envConfigKey] ?? envConfig[envConfigKey];
              }
              var configPath = require('./config.json');
              configPath[moduleName] = envConfig;
              fs.writeFileSync(global.client.configPath, JSON.stringify(configPath, null, 4), 'utf-8');
            }


            if (module.onLoad) {
              const moduleData = {
                api: api
              };
              try {
                module.onLoad(moduleData);
              } catch (error) {
                const errorMessage = "Unable to load the onLoad function of the module."
                throw new Error(errorMessage, 'error');
              }
            }

            if (module.handleEvent) global.client.eventRegistered.push(config.name);
            global.client.commands.set(config.name, module);
            try {
              global.loading.log(`⫸ TBH ➤ ${main(`LOADED`)} ${secondary(config.name)} success`, "COMMAND");
            } catch (err) {
              console.error("An error occurred while loading the command:", err);
            }

            console.err
          } catch (error) {
            global.loading.err(`${chalk.hex('#ff7100')(`LOADED`)} ${chalk.hex("#FFFF00")(command)} fail ` + error, "COMMAND");
          }
        }
      })(),

      (async () => {
        const events = fs.readdirSync(path.join(global.client.mainPath, 'modules/events')).filter(ev => ev.endsWith('.js') && !global.config.eventDisabled.includes(ev));
        console.log(tertiary(`\n` + `──LOADING EVENTS─●`));
        for (const ev of events) {
          try {
            const event = require(path.join(global.client.mainPath, 'modules/events', ev));
            const { config, onLoad, run } = event;
            if (!config || !config.name || !run) {
              global.loading.err(`${chalk.hex('#ff7100')(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} Module is not in the correct format. `, "EVENT");
              continue;
            }


            if (errorMessages.length > 0) {
              console.log("Commands with errors:");
              errorMessages.forEach(({ command, error }) => {
                console.log(`${command}: ${error}`);
              });
            }

            if (global.client.events.has(config.name)) {
              global.loading.err(`${chalk.hex('#ff7100')(`LOADED`)} ${chalk.hex("#FFFF00")(ev)} Module is already loaded!`, "EVENT");
              continue;
            }
            if (config.dependencies) {
              const builtinModules = ['fs', 'path', 'http', 'https', 'url', 'crypto', 'util', 'os', 'child_process', 'stream', 'events', 'buffer', 'querystring', 'zlib'];
              const missingDeps = Object.keys(config.dependencies).filter(dep => !global.nodemodule[dep] && !builtinModules.includes(dep));
              if (missingDeps.length) {
                const depsToInstall = missingDeps.map(dep => `${dep}${config.dependencies[dep] ? '@' + config.dependencies[dep] : ''}`).join(' ');
                if (depsToInstall) {
                execSync(`npm install --no-package-lock --no-save ${depsToInstall}`, {
                  stdio: 'inherit',
                  env: process.env,
                  shell: true,
                  cwd: path.join(__dirname, 'node_modules')
                });
                }
                Object.keys(require.cache).forEach(key => delete require.cache[key]);
              }
            }
            if (config.envConfig) {
              const configModule = global.configModule[config.name] || (global.configModule[config.name] = {});
              const configData = global.config[config.name] || (global.config[config.name] = {});
              for (const evt in config.envConfig) {
                configModule[evt] = configData[evt] = config.envConfig[evt] || '';
              }
              fs.writeFileSync(global.client.configPath, JSON.stringify({
                ...require(global.client.configPath),
                [config.name]: config.envConfig
              }, null, 2));
            }
            if (onLoad) {
              const eventData = {
                api: api
              };
              await onLoad(eventData);
            }
            global.client.events.set(config.name, event);
            global.client.eventRegistered.push(config.name);
            logger(`LOADED ${config.name} success`, "EVENT");
          }
          catch (err) {
            global.loading.err(`${chalk.hex("#ff0000")('ERROR!')} ${secondary(ev)} failed with error: ${err.message}` + `\n`, "EVENT");
          }
        }
      })();
    console.log(tertiary(`\n` + `──BOT START─● `));
    global.loading.log(`⫸ TBH ➤ ${main(`[ SUCCESS ]`)} Loaded ${secondary(`${global.client.commands.size}`)} commands and ${secondary(`${global.client.events.size}`)} events successfully`, "LOADED");
    global.loading.log(`${main(`[ TIMESTART ]`)} Launch time: ${((Date.now() - global.client.timeStart) / 1000).toFixed()}s`, "LOADED");
    global.utils.complete({ raw });
    // Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process
});

const listener = require('./includes/listen')({ api });
    global.handleListen = api.listenMqtt(async (error, event) => {
      if (error) {
        if (error.error === 'Not logged in.') {
          logger.log("Your bot account has been logged out!", 'LOGIN');
          return process.exit(1);
        }
        if (error.error === 'Not logged in') {
          logger.log("Your account has been checkpointed, please confirm your account and log in again!", 'CHECKPOINT');
          return process.exit(0);
        }
        console.log(error);
        return process.exit(0);
      }
      return listener(event);
    });
  });
}

// ___END OF EVENT & API USAGE___ //
(async () => {
  try {
    console.log(tertiary(`\n` + `──DATABASE─●`));
    global.loading.log(`${main(`[ CONNECT ]`)} Connected to JSON database successfully!`, "DATABASE");
    onBot();
  } catch (error) {
    global.loading.err(`${main(`[ CONNECT ]`)} Failed to connect to the JSON database: ` + error, "DATABASE");
  }
})();

/* *
This bot was created by TOHIDUL (TOHI-BOT-HUB). Do not steal my code. (つ ͡ ° ͜ʖ ͡° )つ ✄ ╰⋃╯
This file was modified by TOHIDUL (@TOHI-BOT-HUB). Do not steal my credits. (つ ͡ ° ͜ʖ ͡° )つ ✄ ╰⋃╯
* */