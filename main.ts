import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';

interface PaperNotesSettings {
	template: string;
	authors_as_link: boolean;
	file_name_format: string;
	folder: string;
	pdf_folder: string;
	download_pdf: boolean;
}

const DEFAULT_SETTINGS: PaperNotesSettings = {
	template: '# {{title}}\nAuthors: {{authors}}\nLink: [PDF]({{pdf_file}})\n\n## Abstract\n{{abstract}}',
	authors_as_link: true,
	file_name_format: 'title',
	folder: 'papers',
	pdf_folder: '_pdfs',
	download_pdf: true
}

export default class PaperNotesPlugin extends Plugin {
	settings: PaperNotesSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('newspaper', 'Paper notes', (evt: MouseEvent) => {
			new PaperNotesModal(this).open();
		});

		this.addCommand({
			id: 'open-paper-notes-modal',
			name: 'Load paper details',
			callback: () => {
				new PaperNotesModal(this).open();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PaperNotesSettingsTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadPaperDetails(paper_id: string) {
		const base_url = 'https://arxiv.org/';
		const url = base_url + 'abs/' + paper_id;
		const pdf_url = base_url + 'pdf/' + paper_id + '.pdf';

		const response = await requestUrl(url);
		const text = await response.text;

		const parser = new DOMParser();
		const doc = parser.parseFromString(text, "text/html");

		const abs = doc.querySelector('#abs');
		let title = abs?.querySelector('.title')?.textContent || 'No title';
		let authors = abs?.querySelector('.authors')?.textContent;
		let abstract = abs?.querySelector('.abstract')?.textContent;

		if (title) {
			title = title.replace('Title:', '');
		}

		if (abstract) {
			abstract = abstract.replace('Abstract:', '');
			abstract = abstract.replace(/\n/g, ' ');
			abstract = abstract.replace('  ', ' ');
			abstract = abstract.replace(/\t/g, '');

			abstract = abstract.trim();
		}

		// Convert authors to links
		if (authors && this.settings.authors_as_link) {
			const authors_list = authors.split(', ');
			for (let i = 0; i < authors_list.length; i++) {
				if (i == 0) {
					authors_list[i] = authors_list[i].replace('Authors:', '');
				}
				authors_list[i] = '[[' + authors_list[i] + ']]';
			}
			authors = authors_list.join(', ');
		}

		// Add paper details
		let note = this.settings.template;
		
		// Insert data into template
		if (title) note = note.replace('{{title}}', title);
		if (authors) note = note.replace('{{authors}}', authors);
		if (abstract) note = note.replace('{{abstract}}', abstract);

		note = note.replace('{{pdf_file}}', this.settings.folder + '/' + this.settings.pdf_folder + '/' + paper_id + '.pdf');

		if (this.settings.download_pdf) {
			if (!this.app.vault.getAbstractFileByPath(this.settings.folder + '/' + this.settings.pdf_folder)) {
				await this.app.vault.createFolder(this.settings.folder + '/' + this.settings.pdf_folder);
			}

			if (this.app.vault.getAbstractFileByPath(this.settings.folder + '/' + this.settings.pdf_folder + '/' + paper_id + '.pdf')) {
				new Notice('PDF already exists: ' + paper_id);
			}
			else {
				const pdf_response = await requestUrl(pdf_url);
				const pdf_blob = await pdf_response.arrayBuffer;

				await this.app.vault.createBinary(this.settings.folder + '/' + this.settings.pdf_folder + '/' + paper_id + '.pdf', pdf_blob);
			}
		}

		// Create new note in correct folder
		let paper_title = "";
		if (this.settings.file_name_format == 'title') {
			paper_title = title.replace(':', '-');
		}
		else if (this.settings.file_name_format == 'id') {
			paper_title = paper_id;
		}
		const file_path = this.settings.folder + '/' + paper_title + '.md';

		if (this.app.vault.getAbstractFileByPath(file_path)) {
			new Notice('File already exists');
			return;
		}

		if (!this.app.vault.getAbstractFileByPath(this.settings.folder)) {
			await this.app.vault.createFolder(this.settings.folder);
		}
		
		const file = await app.vault.create(file_path, note);

		app.workspace.getMostRecentLeaf()?.openFile(file);
	}
}

class PaperNotesModal extends Modal {
	plugin: PaperNotesPlugin;

	constructor(plugin: PaperNotesPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;
		
		const inputContainer = contentEl.createDiv('input-container');
		inputContainer.style.display = 'flex';
		inputContainer.style.justifyContent = 'flex-start';

		inputContainer.createEl('label', {
			text: 'Paper ID or URL: '
		});

		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Paper ID or URL'
		});

		input.style.width = '60%';
		input.style.marginLeft = '10px';

		// Create button in new row
		const buttonContainer = contentEl.createDiv('button-container');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';

		const button = buttonContainer.createEl('button', {
			text: 'Load paper details',
			cls: 'mod-cta',

		});

		// Add event listener to button
		button.addEventListener('click', () => {
			let paper_id = input.value;

			paper_id = paper_id.replace('https://arxiv.org/abs/', '');
			paper_id = paper_id.replace('https://arxiv.org/pdf/', '');
			paper_id = paper_id.replace('.pdf', '');
			paper_id = paper_id.replace('.html', '');

			this.plugin.loadPaperDetails(paper_id);
			this.close();
		});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class PaperNotesSettingsTab extends PluginSettingTab {
	plugin: PaperNotesPlugin;

	constructor(app: App, plugin: PaperNotesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for paper notes plugin.'});

		new Setting(containerEl)
			.setName('Template')
			.setDesc('Use this template to create new notes. Use {{title}}, {{authors}}, {{pdf_file}} and {{abstract}} as placeholders.')
			.addTextArea(text => {
				text
				.setPlaceholder("Template")
				.setValue(this.plugin.settings.template)
				.onChange(async (value) => {
					this.plugin.settings.template = value;
					await this.plugin.saveSettings();
				});
				text.inputEl.rows = 15;
				text.inputEl.cols = 50;
			});
		
		// Checkbox to toggle authors as links
		new Setting(containerEl)
			.setName('Authors as links')
			.setDesc('Convert authors to links.')
			.addToggle(toggle => {
				toggle
				.setValue(this.plugin.settings.authors_as_link)
				.onChange(async (value) => {
					this.plugin.settings.authors_as_link = value;
					await this.plugin.saveSettings();
				});
			}
		);

		// Dropdown to select file name format
		new Setting(containerEl)
			.setName('File name format')
			.setDesc('Select the format for the file name.')
			.addDropdown(dropdown => {
				dropdown
				.addOption('title', 'Paper title')
				.addOption('id', 'Paper ID')
				.setValue(this.plugin.settings.file_name_format)
				.onChange(async (value) => {
					this.plugin.settings.file_name_format = value;
					await this.plugin.saveSettings();
				});
			}
		);

		// Text input to specify folder for notes
		new Setting(containerEl)
			.setName('Folder for notes')
			.setDesc('Specify the folder for notes. Default is "papers".')
			.addText(text => {
				text
				.setPlaceholder("papers")
				.setValue(this.plugin.settings.folder)
				.onChange(async (value) => {
					if (value == '') value = 'papers';
					this.plugin.settings.folder = value;
					await this.plugin.saveSettings();
				});
			}
		);

		// Checkbox to toggle download PDF
		new Setting(containerEl)
			.setName('Download PDF')
			.setDesc('Download PDF and save in some folder.')
			.addToggle(toggle => {
				toggle
				.setValue(this.plugin.settings.download_pdf)
				.onChange(async (value) => {
					this.plugin.settings.download_pdf = value;
					await this.plugin.saveSettings();
				});
			}
		);

		// Text input to specify folder for PDFs
		new Setting(containerEl)
			.setName('Folder for PDFs')
			.setDesc('Specify the folder for PDFs. Default is "_pdfs".')
			.addText(text => {
				text
				.setPlaceholder("pdfs")
				.setValue(this.plugin.settings.pdf_folder)
				.onChange(async (value) => {
					if (value == '') value = '_pdfs';
					this.plugin.settings.pdf_folder = value;
					await this.plugin.saveSettings();
				});
			}
		);
	}
}
