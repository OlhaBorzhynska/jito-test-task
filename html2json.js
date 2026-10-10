const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const RAW_TEXT_ELEMENTS = new Set(["script", "style"]);

function findRawTextClosingTag(html, tag, start) {
  const lowerHtml = html.toLowerCase();
  const closingTag = `</${tag}`;
  let index = lowerHtml.indexOf(closingTag, start);

  while (index !== -1) {
    const nextChar = html[index + closingTag.length];

    if (nextChar === ">" || /\s/.test(nextChar || "")) {
      return index;
    }

    index = lowerHtml.indexOf(closingTag, index + closingTag.length);
  }

  return -1;
}

function html2json(htmlText) {
  if (typeof htmlText !== "string") {
    throw new TypeError("html2json expects a string.");
  }

  const root = {
    type: "root",
    children: [],
  };

  const stack = [root];
  let position = 0;

  while (position < htmlText.length) {
    const current = stack[stack.length - 1];

    if (current.type === "element" && RAW_TEXT_ELEMENTS.has(current.tag)) {
      const closingIndex = findRawTextClosingTag(
        htmlText,
        current.tag,
        position,
      );

      if (closingIndex === -1) {
        appendText(current, htmlText.slice(position), false);
        position = htmlText.length;
        break;
      }

      appendText(current, htmlText.slice(position, closingIndex), false);

      stack.pop();
      position = closingIndex;
      continue;
    }

    if (htmlText.startsWith("<!--", position)) {
      const commentEnd = htmlText.indexOf("-->", position + 4);
      const contentEnd = commentEnd === -1 ? htmlText.length : commentEnd;

      stack[stack.length - 1].children.push({
        type: "comment",
        content: htmlText.slice(position + 4, contentEnd),
      });

      position = commentEnd === -1 ? htmlText.length : commentEnd + 3;

      continue;
    }

    if (
      htmlText.startsWith("<!", position) ||
      htmlText.startsWith("<?", position)
    ) {
      const end = findTagEnd(htmlText, position);

      if (end === -1) {
        appendText(stack[stack.length - 1], htmlText.slice(position));
        break;
      }

      position = end + 1;
      continue;
    }

    if (htmlText.startsWith("</", position)) {
      const end = findTagEnd(htmlText, position);

      if (end === -1) {
        appendText(stack[stack.length - 1], htmlText.slice(position));
        break;
      }

      const tagContent = htmlText.slice(position + 2, end).trim();

      const match = tagContent.match(/^([^\s/>]+)/);

      if (match) {
        const tagName = match[1].toLowerCase();

        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === tagName) {
            stack.length = i;
            break;
          }
        }
      }

      position = end + 1;
      continue;
    }

    if (htmlText[position] === "<") {
      const end = findTagEnd(htmlText, position);

      if (end !== -1) {
        const tagContent = htmlText.slice(position + 1, end);
        const parsed = parseOpeningTag(tagContent);

        if (parsed) {
          const element = {
            type: "element",
            tag: parsed.tag,
            attributes: parsed.attributes,
            children: [],
          };

          stack[stack.length - 1].children.push(element);

          if (!parsed.selfClosing && !VOID_ELEMENTS.has(parsed.tag)) {
            stack.push(element);
          }

          position = end + 1;
          continue;
        }
      }

      appendText(stack[stack.length - 1], "<");
      position += 1;
      continue;
    }

    const nextTag = htmlText.indexOf("<", position);
    const end = nextTag === -1 ? htmlText.length : nextTag;

    appendText(stack[stack.length - 1], htmlText.slice(position, end));

    position = end;
  }

  return root;
}

function findTagEnd(html, start) {
  let quote = null;

  for (let i = start + 1; i < html.length; i++) {
    const char = html[i];

    if (quote !== null) {
      if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return i;
    }
  }

  return -1;
}

function parseOpeningTag(content) {
  const match = content.match(/^([^\s/>]+)/);

  if (!match) {
    return null;
  }

  const tag = match[1].toLowerCase();
  const rest = content.slice(match[0].length);

  return {
    tag,
    attributes: parseAttributes(rest),
    selfClosing: /\/\s*$/.test(rest),
  };
}

function parseAttributes(source) {
  const attributes = {};
  let position = 0;

  while (position < source.length) {
    while (/\s/.test(source[position] || "")) {
      position++;
    }

    if (position >= source.length || source[position] === "/") {
      break;
    }

    const nameStart = position;

    while (position < source.length && !/[\s=/>]/.test(source[position])) {
      position++;
    }

    if (position === nameStart) {
      position++;
      continue;
    }

    const name = source.slice(nameStart, position).toLowerCase();

    while (/\s/.test(source[position] || "")) {
      position++;
    }

    let value = "";

    if (source[position] === "=") {
      position++;

      while (/\s/.test(source[position] || "")) {
        position++;
      }

      const quote = source[position];

      if (quote === '"' || quote === "'") {
        position++;
        const valueStart = position;

        while (position < source.length && source[position] !== quote) {
          position++;
        }

        value = source.slice(valueStart, position);

        if (source[position] === quote) {
          position++;
        }
      } else {
        const valueStart = position;

        while (position < source.length && !/[\s>]/.test(source[position])) {
          position++;
        }

        value = source.slice(valueStart, position);
      }
    }

    if (!Object.prototype.hasOwnProperty.call(attributes, name)) {
      attributes[name] = decodeHtmlEntities(value);
    }
  }

  return attributes;
}

function appendText(parent, text, decodeEntities = true) {
  if (text.length === 0) {
    return;
  }

  const content = decodeEntities ? decodeHtmlEntities(text) : text;

  parent.children.push({
    type: "text",
    content,
  });
}

function decodeHtmlEntities(text) {
  const namedEntities = {
    amp: "&",
    AMP: "&",
    lt: "<",
    LT: "<",
    gt: ">",
    GT: ">",
    quot: '"',
    QUOT: '"',
    apos: "'",
    nbsp: "\u00A0",
    copy: "\u00A9",
    COPY: "\u00A9",
    reg: "\u00AE",
    REG: "\u00AE",
    trade: "\u2122",
    euro: "\u20AC",
    pound: "\u00A3",
    yen: "\u00A5",
    cent: "\u00A2",
    deg: "\u00B0",
    plusmn: "\u00B1",
    times: "\u00D7",
    divide: "\u00F7",
    ndash: "\u2013",
    mdash: "\u2014",
    hellip: "\u2026",
    lsquo: "\u2018",
    rsquo: "\u2019",
    ldquo: "\u201C",
    rdquo: "\u201D",
    bull: "\u2022",
    middot: "\u00B7",
  };

  return text.replace(
    /&(#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi,
    (entity, name) => {
      if (name[0] === "#") {
        const isHex = name[1]?.toLowerCase() === "x";

        const number = Number.parseInt(
          name.slice(isHex ? 2 : 1),
          isHex ? 16 : 10,
        );

        if (
          !Number.isFinite(number) ||
          number <= 0 ||
          number > 0x10ffff ||
          (number >= 0xd800 && number <= 0xdfff)
        ) {
          return "\uFFFD";
        }

        return String.fromCodePoint(number);
      }

      return Object.prototype.hasOwnProperty.call(namedEntities, name)
        ? namedEntities[name]
        : entity;
    },
  );
}

function convertHtml2JsonAndSet() {
  const htmlTextAreaValue = document.getElementById("html").value;
  const jsonArea = document.getElementById("json");

  try {
    const jsonObj = html2json(htmlTextAreaValue);
    jsonArea.value = JSON.stringify(jsonObj, null, 2);
  } catch (error) {
    jsonArea.value = `Conversion failed: ${error.message}`;
  }
}

function showExample1() {
  const htmlExample = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport">
    <title>Sample HTML</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>Welcome to My Website</h1>
    </header>
    <nav>
        <ul>
            <li><a href="#home">Home</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
        </ul>
    </nav>
    <main>
        <section id="home">
            <h2>Home Section</h2>
            <p>This is the home section of the webpage.</p>
        </section>
        <section id="about">
            <h2>About Section</h2>
            <p>This is the about section of the webpage.</p>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>
`;
  const jsonContent = html2json(htmlExample);

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").value = JSON.stringify(jsonContent, null, 2);
}

function showExample2() {
  const htmlExample = `<div>
<p>Hello world!</p>
  <button>Click me!</button>
  <textarea>Some very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very very long string.</textarea>
</div>
`;
  const jsonContent = html2json(htmlExample);

  document.getElementById("html").value = htmlExample;
  document.getElementById("json").value = JSON.stringify(jsonContent, null, 2);
}
