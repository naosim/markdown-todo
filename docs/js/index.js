
// marked.setOptions({ langPrefix: '' });

var renderer = new marked.Renderer();
var markdownData = {};
renderer.code = function (code, lang) {
  if(lang == 'html-exec') {
    return code;
  }
  if(lang == 'mermaid') {
    return `<div class="mermaid">${code}</div>`;
  }
  return '<pre><code>'+hljs.highlightAuto(code).value+'</code></pre>';
};

renderer.paragraph = function(text) {
  console.log('paragraph', text);
  return text;
}

renderer.link = function(href, title, text) {
  console.log(href, title, text);
  if(href == '$d') {// 日付
    const d = text.split('/').join('-')
    return `<time datetime="${d}">${text}</time>`;
  }
  if(href == '$eval') {
    return eval(text);
  }
  if(text.indexOf('^$') == 0) {// 変数
    return href;
  }
  if(text.indexOf('^') == 0) {// 脚注
    if(!markdownData.link) {
      markdownData.link = {};
    }
    markdownData.link[text] = href;
    return `<sup><a href="#${text}" title="${href}">${text.slice(1)}</a></sup>`
  }
  return `<a href="${href}">${text}</a>`
}

renderer.image = function(href, title, text) {
  console.log(href, title, text);
  return `<img src="${href}" />`
}

marked.setOptions({
  renderer: renderer
});

/**
 * だいたいキー入力が終わったタイミングを知らせる
 */
class TypeEndEventHandler {
  constructor(callback) {
    this.callback = callback;
    this.keyupEventList = [];
  }
  onKeyup() {
    this.keyupEventList.push(true);
    setTimeout(() => {// 入力が終わって一息ついたら反映する
      if(this.keyupEventList.length > 0) {
        this.keyupEventList.pop();
      }
      if(this.keyupEventList.length == 0) {
        this.callback();
      }
    }, 1000) // 入力終了までの待ち時間
  }
}

/**
 * テキストボックスでタブキー入力時の挙動制御
 * keydownイベント発生時に設定する
 * @param {string} text タブキー入力時に挿入するテキスト。省略時はタブを入力する。 
 */
function typeTab(text) {
  text = text || '\t';
  const textLength = text.length;
  return function(e) {
    var elem, end, start, value;
    if (e.keyCode === 9) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      elem = e.target;
      start = elem.selectionStart;
      end = elem.selectionEnd;
      value = elem.value;
      elem.value = "" + (value.substring(0, start)) + text + (value.substring(end));
      elem.selectionStart = elem.selectionEnd = start + textLength;
      return false;
    }
  }
}

function whiteSpacePrefix(text) {
  var result = '';
  var i = 0;
  while(i < text.length) {
    if(text[i] == ' ') {
      result += ' '
    } else if(text[i] == '　') {// 全角スペース
      result += '　'
    } else {
      return result;
    }
    i++;
  }
  return result;
}

/**
 * テキストボックスエンターキー入力時の挙動制御
 * keydownイベント発生時に設定する
 * 行頭のインデントを揃える
 */
function typeEnter() {
  return function(e) {
    var elem, end, start, value;
    if (e.keyCode === 13) {
      if (e.preventDefault) {
        e.preventDefault();
      }
      elem = e.target;
      start = elem.selectionStart;
      end = elem.selectionEnd;
      value = elem.value;
      const beforeText = (value.substring(0, start));
      const lastLine = beforeText.slice(beforeText.lastIndexOf('\n') + 1);
      const whiteSpace = whiteSpacePrefix(lastLine);

      var insertText = '\n' + whiteSpace;

      elem.value = "" + beforeText + insertText + (value.substring(end));
      elem.selectionStart = elem.selectionEnd = start + insertText.length;
      return false;
    }
  }
}

document.querySelector('#editor').addEventListener('keydown', typeTab('  ')/* スペース2つ */);
document.querySelector('#editor').addEventListener('keydown', typeEnter());


var typeEndEventHandler = new TypeEndEventHandler(refresh);
document.querySelector('#editor').addEventListener('keyup', () => {
  typeEndEventHandler.onKeyup();
})
refresh();

function refresh() {
  markdownData = {};
  var markdownText = document.querySelector('#editor').value.trim();
  if(markdownText.length == 0) {
    markdownText = document.querySelector('#editor').placeholder;
  }
  var html = marked(markdownText);
  html += '<br>';
  if(markdownData.link) {
    html += Object.keys(markdownData.link).map(key => `<a name="${key}">${key.slice(1)}</a>. ${markdownData.link[key]}`).join('<br>')
  }
    
  document.querySelector('#result').innerHTML = html;
  mermaid.init()
}
mermaid.initialize({startOnLoad:false})

