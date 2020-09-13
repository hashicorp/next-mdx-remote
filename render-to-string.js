'use strict'
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i]
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
        }
        return t
      }
    return __assign.apply(this, arguments)
  }
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1]
          return t[1]
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this
        }),
      g
    )
    function verb(n) {
      return function (v) {
        return step([n, v])
      }
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.')
      while (_)
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                  ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t
          if (((y = 0), t)) op = [op[0] & 2, t.value]
          switch (op[0]) {
            case 0:
            case 1:
              t = op
              break
            case 4:
              _.label++
              return { value: op[1], done: false }
            case 5:
              _.label++
              y = op[1]
              op = [0]
              continue
            case 7:
              op = _.ops.pop()
              _.trys.pop()
              continue
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0
                continue
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1]
                break
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1]
                t = op
                break
              }
              if (t && _.label < t[2]) {
                _.label = t[2]
                _.ops.push(op)
                break
              }
              if (t[2]) _.ops.pop()
              _.trys.pop()
              continue
          }
          op = body.call(thisArg, _)
        } catch (e) {
          op = [6, e]
          y = 0
        } finally {
          f = t = 0
        }
      if (op[0] & 5) throw op[1]
      return { value: op[0] ? op[1] : void 0, done: true }
    }
  }
var __spreadArrays =
  (this && this.__spreadArrays) ||
  function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++)
      s += arguments[i].length
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
      for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
        r[k] = a[j]
    return r
  }
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
var mdx_1 = __importDefault(require('@mdx-js/mdx'))
var react_1 = require('@mdx-js/react')
var core_1 = require('@babel/core')
var preset_env_1 = __importDefault(require('@babel/preset-env'))
var preset_react_1 = __importDefault(require('@babel/preset-react'))
var server_1 = require('react-dom/server')
var babel_plugin_mdx_browser_1 = __importDefault(
  require('./babel-plugin-mdx-browser')
)
var react_2 = __importDefault(require('react'))
function renderToString(source, _a) {
  var _b = _a === void 0 ? {} : _a,
    components = _b.components,
    mdxOptions = _b.mdxOptions,
    _c = _b.scope,
    scope = _c === void 0 ? {} : _c
  return __awaiter(this, void 0, void 0, function () {
    var code, _d, now, later, component
    return __generator(this, function (_e) {
      switch (_e.label) {
        case 0:
          return [
            4 /*yield*/,
            mdx_1.default(
              source,
              __assign(__assign({}, mdxOptions), { skipExport: true })
            ),
          ]
        case 1:
          code = _e.sent()
          return [
            4 /*yield*/,
            Promise.all([
              // this one is for immediate evaluation so we can renderToString below
              core_1.transformAsync(code, {
                presets: [preset_react_1.default, preset_env_1.default],
                configFile: false,
              }),
              // this one is for the browser to eval and rehydrate, later
              core_1.transformAsync(code, {
                presets: [preset_react_1.default, preset_env_1.default],
                plugins: [babel_plugin_mdx_browser_1.default],
                configFile: false,
              }),
            ]),
          ]
        case 2:
          ;(_d = _e.sent()), (now = _d[0]), (later = _d[1])
          if (!now || !later || !later.code) {
            throw new Error('Failed to transform mdx source code')
          }
          component = new (Function.bind.apply(
            Function,
            __spreadArrays(
              [void 0, 'React', 'MDXProvider', 'mdx', 'components'],
              Object.keys(scope),
              [
                now.code +
                  '\nreturn React.createElement(MDXProvider, { components },\n  React.createElement(MDXContent, {})\n);',
              ]
            )
          ))().apply(
            void 0,
            __spreadArrays(
              [react_2.default, react_1.MDXProvider, react_1.mdx, components],
              Object.values(scope)
            )
          )
          return [
            2 /*return*/,
            {
              compiledSource: later.code,
              // react: render to string
              renderedOutput: server_1.renderToString(component),
              scope: scope,
            },
          ]
      }
    })
  })
}
exports.default = renderToString
//# sourceMappingURL=render-to-string.js.map
