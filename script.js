// script.js
document.addEventListener('DOMContentLoaded', function() {
    // ===== VARIÁVEIS GLOBAIS =====
    let notes = JSON.parse(localStorage.getItem('menota-notes')) || [];
    let currentFilterCategory = null;
    let currentlyEditingId = null;

    // ===== ELEMENTOS DO DOM =====
    // Criador de Notas
    const noteCreator = document.getElementById('noteCreator');
    const saveButton = document.getElementById('saveNote');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteTextInput = document.getElementById('noteText');
    const noteColorInput = document.getElementById('noteColor');
    
    // Editor de Notas
    const noteEditor = document.getElementById('noteEditor');
    const editNoteTitle = document.getElementById('editNoteTitle');
    const editNoteText = document.getElementById('editNoteText');
    const editNoteColor = document.getElementById('editNoteColor');
    const updateNoteButton = document.getElementById('updateNote');
    const cancelEditButton = document.getElementById('cancelEdit');
    const deleteNoteButton = document.getElementById('deleteNote');
    
    // Busca e Filtros
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const notesGrid = document.getElementById('notesGrid');
    const categoriesFilter = document.getElementById('categoriesFilter');
    
    // Categorias
    const categoriesFilterButton = document.getElementById('categoriesFilterButton');
    const categoriesModal = document.getElementById('categoriesModal');
    const closeModal = document.getElementById('closeModal');
    const categoriesList = document.getElementById('categoriesList');
    const clearFilter = document.getElementById('clearFilter');
    
    // Backup
    const exportNotesButton = document.getElementById('exportNotes');
    const importNotesInput = document.getElementById('importNotes');
    
    // Todo List
    const addTodoButton = document.getElementById('addTodoItem');
    const todoList = document.getElementById('todoList');
    const addTodoButtonEdit = document.getElementById('addTodoItemEdit');
    const editTodoList = document.getElementById('editTodoList');
    
    // Formatação
    const formattingButtons = document.querySelectorAll('.formatting-toolbar button[data-command]');
    
    // Upload de Arquivos
    const imageUpload = document.getElementById('imageUpload');
    const audioUpload = document.getElementById('audioUpload');

    // ===== INICIALIZAÇÃO =====
    init();

    function init() {
        console.log('Inicializando MeNota...');
        renderNotes();
        updateCategoriesFilter();
        setupEventListeners();
        setupGoogleKeepBehavior();
        
        if (notes.length === 0) {
            showNotification('Bem-vindo ao MeNota! Clique em "Escreva uma nota..." para começar.');
        }
    }

    function setupEventListeners() {
        // Sistema de Notas
        saveButton.addEventListener('click', saveNote);
        updateNoteButton.addEventListener('click', updateNote);
        cancelEditButton.addEventListener('click', cancelEdit);
        deleteNoteButton.addEventListener('click', deleteNote);

        // Formatação
        formattingButtons.forEach(button => {
            button.addEventListener('click', () => {
                const command = button.getAttribute('data-command');
                const activeEditor = noteEditor.style.display !== 'none' ? editNoteText : noteTextInput;
                document.execCommand(command, false, null);
                activeEditor.focus();
            });
        });

        // Busca e Filtros
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        categoriesFilterButton.addEventListener('click', openCategoriesModal);
        closeModal.addEventListener('click', closeCategoriesModal);
        clearFilter.addEventListener('click', clearCategoryFilter);
        categoriesModal.addEventListener('click', (e) => {
            if (e.target === categoriesModal) closeCategoriesModal();
        });

        // Backup
        exportNotesButton.addEventListener('click', exportNotesToCSV);
        importNotesInput.addEventListener('change', importNotesFromFile);

        // Todo List
        addTodoButton.addEventListener('click', () => addTodoItem(todoList));
        addTodoButtonEdit.addEventListener('click', () => addTodoItem(editTodoList));

        // Upload de Arquivos
        imageUpload.addEventListener('change', handleImageUpload);
        audioUpload.addEventListener('change', handleAudioUpload);

        // Teclas de Atalho
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (categoriesModal.style.display === 'block') {
                    closeCategoriesModal();
                } else if (noteCreator.classList.contains('expanded')) {
                    checkAndCollapse();
                }
            }
        });
    }

    // ===== COMPORTAMENTO GOOGLE KEEP =====
    function setupGoogleKeepBehavior() {
        console.log('Configurando comportamento Google Keep...');
        
        // Expande ao clicar no criador compacto
        noteCreator.addEventListener('click', function(e) {
            console.log('Click no note-creator, estado:', noteCreator.classList.contains('compact') ? 'compact' : 'expanded');
            
            if (noteCreator.classList.contains('compact')) {
                expandNoteCreator();
                e.stopPropagation();
            }
        });
        
        // Impede que clicks nos elementos internos fechem o criador
        noteTextInput.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        noteTitleInput.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Fecha ao clicar fora
        document.addEventListener('click', function(e) {
            if (noteCreator.classList.contains('expanded') && !noteCreator.contains(e.target)) {
                console.log('Click fora do note-creator expandido');
                checkAndCollapse();
            }
        });
    }

    function expandNoteCreator() {
        console.log('Expandindo note creator...');
        
        noteCreator.classList.remove('compact');
        noteCreator.classList.add('expanded');
        
        // Foca no campo de texto
        setTimeout(() => {
            noteTextInput.focus();
            console.log('Foco aplicado no campo de texto');
        }, 100);
    }

    function checkAndCollapse() {
        const hasContent = noteTitleInput.value.trim() || 
                          noteTextInput.textContent.trim() || 
                          getTodoData(todoList).length > 0;
        
        console.log('Verificando se pode colapsar. Tem conteúdo?', hasContent);
        
        if (!hasContent) {
            collapseNoteCreator();
        }
    }

    function collapseNoteCreator() {
        console.log('Colapsando note creator...');
        
        noteCreator.classList.remove('expanded');
        noteCreator.classList.add('compact');
        clearInputs();
    }

    // ===== SISTEMA DE GERENCIAMENTO DE NOTAS =====
    function saveNote() {
        console.log('Salvando nota...');
        
        const title = noteTitleInput.value.trim();
        const text = noteTextInput.innerHTML.trim();
        const textContent = noteTextInput.textContent.trim();
        const color = noteColorInput.value;
        const todos = getTodoData(todoList);

        console.log('Dados da nota:', { title, textContent, todos: todos.length });

        if (title && (textContent || todos.length > 0)) {
            const newNote = {
                id: Date.now().toString(),
                title,
                text,
                color,
                todos: todos,
                timestamp: new Date().toISOString()
            };

            notes.unshift(newNote);
            saveToLocalStorage();
            renderNotes();
            updateCategoriesFilter();
            clearInputs();
            showNotification('Nota criada com sucesso!');
            
            collapseNoteCreator();
        } else {
            alert('Por favor, preencha pelo menos o título e algum conteúdo ou tarefa.');
        }
    }

    function updateNote() {
        if (!currentlyEditingId) return;

        const title = editNoteTitle.value.trim();
        const text = editNoteText.innerHTML.trim();
        const textContent = editNoteText.textContent.trim();
        const color = editNoteColor.value;
        const todos = getTodoData(editTodoList);

        if (title && (textContent || todos.length > 0)) {
            const noteIndex = notes.findIndex(n => n.id === currentlyEditingId);
            if (noteIndex !== -1) {
                notes[noteIndex] = {
                    ...notes[noteIndex],
                    title,
                    text,
                    color,
                    todos: todos,
                    lastModified: new Date().toISOString()
                };

                saveToLocalStorage();
                cancelEdit();
                renderNotes();
                updateCategoriesFilter();
                showNotification('Nota atualizada com sucesso!');
            }
        } else {
            alert('Por favor, preencha pelo menos o título e algum conteúdo ou tarefa.');
        }
    }

    function deleteNote() {
        if (!currentlyEditingId) return;
        if (confirm('Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.')) {
            deleteNoteById(currentlyEditingId);
            cancelEdit();
        }
    }

    function deleteNoteById(noteId) {
        notes = notes.filter(n => n.id !== noteId);
        saveToLocalStorage();
        renderNotes();
        updateCategoriesFilter();
        showNotification('Nota excluída com sucesso!');
    }

    function openEditor(noteId) {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;

        currentlyEditingId = noteId;
        
        // Preenche os campos do editor
        editNoteTitle.value = note.title;
        editNoteText.innerHTML = note.text;
        editNoteColor.value = note.color || '#2d5a2d';
        
        // Carrega as todos
        loadTodoData(editTodoList, note.todos || []);
        
        // Processa e exibe links
        displayLinksInEditor(note.text, note.todos);
        
        // Mostra o editor e esconde o criador
        noteCreator.style.display = 'none';
        noteEditor.style.display = 'block';
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelEdit() {
        currentlyEditingId = null;
        noteEditor.style.display = 'none';
        noteCreator.style.display = 'block';
        clearEditorInputs();
    }

    // ===== SISTEMA DE RENDERIZAÇÃO =====
    function renderNotes(notesToRender = notes) {
        console.log('Renderizando notas:', notesToRender.length);
        
        notesGrid.innerHTML = '';

        if (notesToRender.length === 0) {
            notesGrid.innerHTML = '<p class="no-notes">Nenhuma nota encontrada. Crie sua primeira nota!</p>';
            return;
        }

        notesToRender.forEach(note => {
            const noteCard = document.createElement('div');
            
            // Extrai a primeira imagem para thumbnail
            const firstImage = extractFirstImageFromNote(note.text);
            const hasImage = firstImage !== null;

            noteCard.className = `note-card`;
            noteCard.style.borderLeftColor = note.color;

            const categoryMatches = note.text.match(/#([a-zA-Z0-9\u00C0-\u00FF\u00D1\u00F1_-]+)/g) || [];
            const categories = [...new Set(categoryMatches)];
            const previewText = note.text.replace(/<[^>]*>/g, '').substring(0, 120) + '...';

            // Calcula progresso das tarefas
            const todos = note.todos || [];
            const completedTodos = todos.filter(todo => todo.completed).length;
            const totalTodos = todos.length;
            const hasTodosContent = totalTodos > 0;

            noteCard.innerHTML = `
                ${hasImage ? `
                    <div class="note-thumbnail-container">
                        <img class="note-thumbnail" src="${firstImage}" alt="Thumbnail da nota" onerror="this.parentElement.remove()">
                    </div>
                ` : ''}
                
                <div class="note-content">
                    <h3>${note.title}</h3>
                    <div class="note-preview">${previewText}</div>
                    
                    ${hasTodosContent ? `
                        <div class="note-todo-indicator">
                            <span>✅ ${completedTodos}/${totalTodos}</span>
                            <span class="todo-progress">tarefas</span>
                        </div>
                    ` : ''}
                    
                    ${categories.length > 0 ? `<div class="note-category">${categories.join(', ')}</div>` : ''}
                    
                    <div class="note-actions">
                        <button class="action-button edit-button" data-id="${note.id}" title="Editar nota">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                        <button class="action-button delete-button-small" data-id="${note.id}" title="Excluir nota">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            // Event Listeners
            const editBtn = noteCard.querySelector('.edit-button');
            const deleteBtn = noteCard.querySelector('.delete-button-small');

            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditor(note.id);
            });

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Tem certeza que deseja excluir esta nota?')) {
                    deleteNoteById(note.id);
                }
            });

            noteCard.addEventListener('click', () => {
                openEditor(note.id);
            });

            notesGrid.appendChild(noteCard);
        });
        
        console.log('Notas renderizadas com sucesso');
    }

    // ===== SISTEMA DE TODO LIST =====
    function addTodoItem(container) {
        const todoId = Date.now().toString();
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        todoItem.setAttribute('data-todo-id', todoId);
        
        todoItem.innerHTML = `
            <input type="checkbox" class="todo-checkbox">
            <input type="text" class="todo-text" placeholder="Digite uma tarefa...">
            <div class="todo-actions">
                <button type="button" class="todo-delete" title="Excluir tarefa">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
        
        // Event Listeners para o novo item
        const checkbox = todoItem.querySelector('.todo-checkbox');
        const textInput = todoItem.querySelector('.todo-text');
        const deleteBtn = todoItem.querySelector('.todo-delete');
        
        checkbox.addEventListener('change', function() {
            textInput.classList.toggle('completed', this.checked);
        });
        
        textInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTodoItem(container);
            }
        });
        
        deleteBtn.addEventListener('click', function() {
            todoItem.remove();
        });
        
        container.appendChild(todoItem);
        textInput.focus();
    }

    function getTodoData(container) {
        const todos = [];
        const todoItems = container.querySelectorAll('.todo-item');
        
        todoItems.forEach(item => {
            const checkbox = item.querySelector('.todo-checkbox');
            const textInput = item.querySelector('.todo-text');
            
            if (textInput.value.trim() !== '') {
                todos.push({
                    id: item.getAttribute('data-todo-id'),
                    text: textInput.value.trim(),
                    completed: checkbox.checked
                });
            }
        });
        
        return todos;
    }

    function loadTodoData(container, todos) {
        container.innerHTML = '';
        
        if (todos && todos.length > 0) {
            todos.forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = 'todo-item';
                todoItem.setAttribute('data-todo-id', todo.id);
                
                todoItem.innerHTML = `
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                    <input type="text" class="todo-text ${todo.completed ? 'completed' : ''}" value="${todo.text}">
                    <div class="todo-actions">
                        <button type="button" class="todo-delete" title="Excluir tarefa">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                `;
                
                // Event Listeners
                const checkbox = todoItem.querySelector('.todo-checkbox');
                const textInput = todoItem.querySelector('.todo-text');
                const deleteBtn = todoItem.querySelector('.todo-delete');
                
                checkbox.addEventListener('change', function() {
                    textInput.classList.toggle('completed', this.checked);
                });
                
                textInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        addTodoItem(container);
                    }
                });
                
                deleteBtn.addEventListener('click', function() {
                    todoItem.remove();
                });
                
                container.appendChild(todoItem);
            });
        }
    }

    // ===== SISTEMA DE LINKS =====
    function isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function extractLinksFromText(text) {
        const textWithoutHtml = text
            .replace(/<[^>]*>/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ');
        
        const linkRegex = /https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=%]*[a-zA-Z0-9]/g;
        const potentialLinks = textWithoutHtml.match(linkRegex) || [];
        
        const validLinks = potentialLinks
            .map(link => link.replace(/[.,;:!?)\]\}\s'"`]+$/, ''))
            .filter(link => isValidUrl(link) && link.length >= 8 && !link.includes(' '));
        
        return [...new Set(validLinks)];
    }

    function displayLinksInEditor(noteText, todos = []) {
        const links = extractLinksFromText(noteText);
        const hasTodos = todos && todos.length > 0;
        const hasLinks = links.length > 0;
        
        const isEditing = noteEditor.style.display !== 'none';
        const bottomContainer = isEditing ? 
            document.getElementById('editBottomSections') : 
            document.getElementById('bottomSections');
        
        // Limpa o container
        if (bottomContainer) {
            bottomContainer.innerHTML = '';
        }
        
        const contentContainer = isEditing ? 
            document.querySelector('#noteEditor .content-sections-container') : 
            document.querySelector('.note-creator .content-sections-container');
        
        if (!contentContainer) return;
        
        // Configura o layout
        if (!hasLinks) {
            contentContainer.className = 'content-sections-container single-section';
            return;
        }
        
        if (hasTodos) {
            contentContainer.className = 'content-sections-container';
        } else {
            contentContainer.className = 'content-sections-container single-section';
            if (bottomContainer) {
                bottomContainer.className = 'bottom-sections-container single-section';
            }
        }
        
        // Adiciona a seção de links se houver links
        if (hasLinks && bottomContainer) {
            const linksSection = document.createElement('div');
            linksSection.id = isEditing ? 'editNoteLinksSection' : 'noteLinksSection';
            linksSection.className = 'note-links-section compact';
            
            const linksTitle = document.createElement('h4');
            linksTitle.textContent = `Links (${links.length})`;
            linksTitle.className = 'links-title';
            
            const linksList = document.createElement('div');
            linksList.className = 'links-list';
            
            // Limita para mostrar apenas os primeiros 5 links
            links.slice(0, 5).forEach(link => {
                if (isValidUrl(link)) {
                    createLinkItem(link, linksList);
                }
            });
            
            linksSection.appendChild(linksTitle);
            linksSection.appendChild(linksList);
            bottomContainer.appendChild(linksSection);
        }
    }

    async function createLinkItem(link, container) {
        const linkItem = document.createElement('div');
        linkItem.className = 'link-item';
        
        const linkContent = document.createElement('div');
        linkContent.className = 'link-content';
        
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'thumbnail-container';
        
        const thumbnailImg = document.createElement('img');
        thumbnailImg.className = 'link-thumbnail loading';
        thumbnailImg.alt = `Preview de ${link}`;
        thumbnailImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMzMzMiLz48cGF0aCBkPSJNNDAgMzVIMzgwTTQwIDQ1SDgwTTQwIDU1SDcwIiBzdHJva2U9IiM2NjY2NjYiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==';
        
        thumbnailContainer.appendChild(thumbnailImg);
        
        const linkInfo = document.createElement('div');
        linkInfo.className = 'link-info';
        
        const linkAnchor = document.createElement('a');
        linkAnchor.href = link;
        linkAnchor.textContent = getDomainFromUrl(link);
        linkAnchor.target = '_blank';
        linkAnchor.rel = 'noopener noreferrer';
        linkAnchor.className = 'note-link';
        linkAnchor.title = link;
        
        const linkUrl = document.createElement('div');
        linkUrl.className = 'link-url';
        linkUrl.textContent = truncateUrl(link, 50);
        
        const actionButtons = document.createElement('div');
        actionButtons.className = 'link-actions';
        
        const copyButton = document.createElement('button');
        copyButton.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
        copyButton.title = 'Copiar link';
        copyButton.className = 'copy-link-button';
        copyButton.addEventListener('click', () => copyLinkToClipboard(link));
        
        actionButtons.appendChild(copyButton);
        
        linkInfo.appendChild(linkAnchor);
        linkInfo.appendChild(linkUrl);
        linkInfo.appendChild(actionButtons);
        
        linkContent.appendChild(thumbnailContainer);
        linkContent.appendChild(linkInfo);
        
        linkItem.appendChild(linkContent);
        container.appendChild(linkItem);
        
        await loadWebsiteThumbnail(link, thumbnailImg);
    }

    function getDomainFromUrl(url) {
        try {
            const domain = new URL(url).hostname.replace('www.', '');
            return domain.charAt(0).toUpperCase() + domain.slice(1);
        } catch {
            return 'Site';
        }
    }

    function truncateUrl(url, maxLength) {
        return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }

    async function loadWebsiteThumbnail(url, imgElement) {
        try {
            const domain = new URL(url).hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
            
            const response = await fetch(faviconUrl);
            if (response.ok) {
                imgElement.src = faviconUrl;
                imgElement.style.objectFit = 'contain';
                imgElement.style.padding = '10px';
            } else {
                throw new Error('Favicon não encontrado');
            }
            
            imgElement.classList.remove('loading');
            imgElement.classList.add('loaded');
            
        } catch (error) {
            imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTIwIDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiMyZDJkMmQiIHJ4PSI2Ii8+PHBhdGggZD0iTTQwIDM1SDgwTTQwIDQ1SDcwTTQwIDU1SDYwIiBzdHJva2U9IiM1NTU1NTUiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzUiIHI9IjUiIGZpbGw9IiMyZDVhMmQiLz48dGV4dCB4PSI2MCIgeT0iNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2NjY2NjYiIGZvbnQtc2l6ZT0iMTAiPkxpbms8L3RleHQ+PC9zdmc+';
            imgElement.classList.remove('loading');
            imgElement.classList.add('error');
        }
    }

    function copyLinkToClipboard(link) {
        navigator.clipboard.writeText(link).then(() => {
            showNotification('Link copiado para a área de transferência!');
        }).catch(err => {
            console.error('Erro ao copiar link:', err);
            showNotification('Erro ao copiar link.');
        });
    }

    // ===== SISTEMA DE CATEGORIAS =====
    function updateCategoriesFilter() {
        const allCategories = new Set();
        notes.forEach(note => {
            const categoriesInNote = note.text.match(/#([a-zA-Z0-9\u00C0-\u00FF\u00D1\u00F1_-]+)/g) || [];
            categoriesInNote.forEach(cat => allCategories.add(cat));
        });

        categoriesFilter.innerHTML = '<span class="category-chip" data-category="all">Todas</span>';

        allCategories.forEach(category => {
            const chip = document.createElement('span');
            chip.className = 'category-chip';
            chip.textContent = category;
            chip.setAttribute('data-category', category);
            
            chip.addEventListener('click', () => {
                filterNotesByCategory(category);
            });

            categoriesFilter.appendChild(chip);
        });

        if (categoriesModal.style.display === 'block') {
            updateCategoriesModal();
        }
    }

    function openCategoriesModal() {
        updateCategoriesModal();
        categoriesModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeCategoriesModal() {
        categoriesModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    function updateCategoriesModal() {
        const categories = getAllCategories();
        categoriesList.innerHTML = '';

        if (categories.length === 0) {
            categoriesList.innerHTML = '<p class="no-categories">Nenhuma categoria encontrada.</p>';
            return;
        }

        categories.sort((a, b) => a.name.localeCompare(b.name));

        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = `modal-category-item ${currentFilterCategory === category.name ? 'active' : ''}`;
            categoryItem.innerHTML = `
                <span>${category.name}</span>
                <span class="category-count">${category.count}</span>
            `;

            categoryItem.addEventListener('click', () => {
                filterNotesByCategory(category.name);
                closeCategoriesModal();
            });

            categoriesList.appendChild(categoryItem);
        });
    }

    function getAllCategories() {
        const categoryMap = new Map();
        
        notes.forEach(note => {
            const categoriesInNote = note.text.match(/#([a-zA-Z0-9\u00C0-\u00FF\u00D1\u00F1_-]+)/g) || [];
            categoriesInNote.forEach(cat => {
                categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
            });
        });

        return Array.from(categoryMap.entries()).map(([name, count]) => ({
            name,
            count
        }));
    }

    function filterNotesByCategory(category) {
        currentFilterCategory = category === 'all' ? null : category;
        
        const filteredNotes = category === 'all' 
            ? notes 
            : notes.filter(note => {
                const categoryRegex = new RegExp(category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                return note.text.match(categoryRegex);
            });
        
        renderNotes(filteredNotes);
        
        if (category !== 'all') {
            showNotification(`Filtrando por: ${category}`);
        }
    }

    function clearCategoryFilter() {
        currentFilterCategory = null;
        renderNotes();
        closeCategoriesModal();
        showNotification('Filtro removido');
    }

    // ===== SISTEMA DE BUSCA =====
    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        
        if (searchTerm) {
            const searchResults = notes.filter(note => 
                note.title.toLowerCase().includes(searchTerm) || 
                note.text.toLowerCase().includes(searchTerm)
            );
            renderNotes(searchResults);
        } else {
            renderNotes();
        }
    }

    // ===== SISTEMA DE BACKUP =====
    function exportNotesToCSV() {
        if (notes.length === 0) {
            showNotification('Não há notas para exportar.');
            return;
        }

        try {
            const BOM = "\ufeff";
            const headers = ['ID', 'Título', 'Texto', 'Cor', 'DataCriacao', 'DataModificacao'];
            const csvRows = [headers.join(',')];

            notes.forEach(note => {
                const cleanText = note.text
                    .replace(/\n/g, ' ')
                    .replace(/\r/g, ' ')
                    .replace(/"/g, '""')
                    .trim();

                const row = [
                    note.id,
                    `"${note.title.replace(/"/g, '""')}"`,
                    `"${cleanText}"`,
                    note.color,
                    note.timestamp,
                    note.lastModified || note.timestamp
                ];
                csvRows.push(row.join(','));
            });

            const csvString = csvRows.join('\n');
            const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `MeNota_Backup_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            
            URL.revokeObjectURL(url);
            showNotification(`Exportadas ${notes.length} notas com sucesso!`);
            
        } catch (error) {
            console.error('Erro ao exportar notas:', error);
            showNotification('Erro ao exportar notas. Verifique o console.');
        }
    }

    function importNotesFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                let importedNotes = [];

                if (file.name.endsWith('.csv')) {
                    importedNotes = parseCSV(content);
                } else if (file.name.endsWith('.json')) {
                    importedNotes = JSON.parse(content);
                } else {
                    try {
                        importedNotes = JSON.parse(content);
                    } catch {
                        importedNotes = parseCSV(content);
                    }
                }

                if (importedNotes.length === 0) {
                    throw new Error('Nenhuma nota válida encontrada no arquivo.');
                }

                if (confirm(`Deseja importar ${importedNotes.length} notas? Isso irá adicionar às notas existentes.`)) {
                    const existingNotes = JSON.parse(localStorage.getItem('menota-notes')) || [];
                    const combinedNotes = [...importedNotes, ...existingNotes];
                    
                    const uniqueNotes = combinedNotes.filter((note, index, self) =>
                        index === self.findIndex(n => n.id === note.id)
                    );

                    notes = uniqueNotes;
                    saveToLocalStorage();
                    
                    renderNotes();
                    updateCategoriesFilter();
                    showNotification(`Importadas ${importedNotes.length} notas com sucesso!`);
                }

            } catch (error) {
                console.error('Erro ao importar notas:', error);
                showNotification('Erro ao importar arquivo. Verifique o formato.');
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    }

    function parseCSV(csvText) {
        const cleanCSVText = csvText.replace(/^\ufeff/, '');
        const lines = cleanCSVText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(header => header.trim());
        const notes = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const values = [];
            let inQuotes = false;
            let currentValue = '';

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue);

            if (values.length >= headers.length) {
                const note = {
                    id: values[0] || Date.now().toString() + i,
                    title: values[1] ? values[1].replace(/^"|"$/g, '').replace(/""/g, '"') : 'Nota Importada',
                    text: values[2] ? values[2].replace(/^"|"$/g, '').replace(/""/g, '"') : '',
                    color: values[3] || '#2d5a2d',
                    timestamp: values[4] || new Date().toISOString(),
                    lastModified: values[5] || new Date().toISOString()
                };
                notes.push(note);
            }
        }

        return notes;
    }

    // ===== FUNÇÕES AUXILIARES =====
    function saveToLocalStorage() {
        localStorage.setItem('menota-notes', JSON.stringify(notes));
    }

    function clearInputs() {
        noteTitleInput.value = '';
        noteTextInput.innerHTML = '';
        noteColorInput.value = '#2d5a2d';
        todoList.innerHTML = '';
        document.getElementById('bottomSections').innerHTML = '';
        
        const contentContainer = document.querySelector('.note-creator .content-sections-container');
        if (contentContainer) contentContainer.className = 'content-sections-container';
    }

    function clearEditorInputs() {
        editNoteTitle.value = '';
        editNoteText.innerHTML = '';
        editNoteColor.value = '#2d5a2d';
        editTodoList.innerHTML = '';
        document.getElementById('editBottomSections').innerHTML = '';
        
        const editContentContainer = document.querySelector('#noteEditor .content-sections-container');
        if (editContentContainer) editContentContainer.className = 'content-sections-container';
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const activeEditor = noteEditor.style.display !== 'none' ? editNoteText : noteTextInput;
                document.execCommand('insertImage', false, e.target.result);
                activeEditor.focus();
            };
            reader.readAsDataURL(file);
        }
    }

    function handleAudioUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const audioUrl = URL.createObjectURL(file);
            const audioHTML = `<audio controls src="${audioUrl}"></audio>`;
            const activeEditor = noteEditor.style.display !== 'none' ? editNoteText : noteTextInput;
            document.execCommand('insertHTML', false, audioHTML);
            activeEditor.focus();
        }
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            font-family: inherit;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 2000);
    }
});

// ===== FUNÇÕES GLOBAIS =====
function extractFirstImageFromNote(noteText) {
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = noteText;
        
        const firstImg = tempDiv.querySelector('img');
        
        if (firstImg && firstImg.src) {
            const src = firstImg.src;
            if (src.startsWith('http') || src.startsWith('data:')) {
                return src;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Erro ao extrair imagem:', error);
        return null;
    }
}

// ===== PWA =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registrado com sucesso: ', registration.scope);
      })
      .catch(function(error) {
        console.log('Falha no registro do ServiceWorker: ', error);
      });
  });
}

function isRunningInPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

if (isRunningInPWA()) {
  document.documentElement.classList.add('pwa-mode');
}
