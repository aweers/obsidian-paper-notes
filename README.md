# Obsidian Sample Plugin

This is a plugin for [Obsidian](https://obsidian.md/), a powerful note-taking and knowledge base tool that works on top of a local folder of plain text Markdown files. 

This plugin enables the user to quickly retrieve important information from an arXiv paper. After specifying the arXiv ID of the paper, the plugin will find the paper's title, authors, abstract, and link to the paper. There is also an option to download and save the paper's PDF.

## Template
The information (like title, authors, abstract, etc.) can be inserted into a template specified by the user in the plugin settings. For this the following placeholders can be used:
- `{{title}}` - The title of the paper
- `{{authors}}` - The authors of the paper
- `{{abstract}}` - The abstract of the paper
- `{{pdf}}` - The link to the paper's PDF

## Additional Features
- The plugin can be used to quickly retrieve information from a paper without having to open the paper's PDF.
- The names of the authors can be inserted as links, which can be used to quickly search for other papers by the same author.
- The plugin can be used to quickly download and save a paper's PDF.

## Future Plans
- Add support for other sources if desired.
- Wait for feedback and implement new features.