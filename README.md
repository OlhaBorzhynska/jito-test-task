# HTML to JSON Parser

A lightweight JavaScript utility that converts an HTML string into a structured JSON representation without using the browser DOM parser.

## Features

- Parses HTML elements, attributes, text nodes, and comments.
- Preserves nested element structures and whitespace.
- Handles void elements such as img, br, and input.
- Supports raw text content inside script and style elements.
- Decodes common named HTML entities and numeric character references.
- Handles malformed or incomplete HTML without crashing in common cases.
- Provides an interactive interface for entering HTML and viewing the resulting JSON.

## JSON Structure

The parser returns a root object containing an array of child nodes.

**Root node:**

```bash
{
"type": "root",
"children": []
}
```

**Element node:**

```bash
{
  "type": "element",
  "tag": "p",
  "attributes":
  {
    "class": "description"
  },
  "children": [
    {
      "type": "text",
      "content": "Hello, world!"
    }
  ]
}
```

Other node types include text and comment.

## How to Run

1. Clone or download the repository.
2. Open index.html in a web browser.
3. Enter an HTML snippet or use one of the built-in examples.
4. Click the conversion button to view the JSON output.
5. No build step is required for the current implementation.

## Testing

The **html_samples/** directory contains HTML snippets used to test different scenarios, including:

- Empty input and whitespace-only content.
- Long text and multiple elements.
- Nested and malformed tags.
- Attributes with quoted and unquoted values.
- HTML comments and character references.
- script and style elements.
- Void elements and incomplete markup.
- Limitations

This is a lightweight custom parser, not a complete HTML5-compliant parser. It does not implement every HTML parsing rule, and named entity decoding is limited to a predefined set of common entities.

The parser is designed to preserve input content and handle common HTML structures and malformed input without crashing in typical cases.

## Technologies

- **JavaScript**
- **HTML**
- **CSS**

## Author

**Olha Borzhynska** - Junior Full-Stack Developer

GitHub: https://github.com/OlhaBorzhynska

LinkedIn: www.linkedin.com/in/olha-borzhynska

Email: mykytlo@gmail.com
