// ===== VARIÁVEIS GLOBAIS =====
let notes = JSON.parse(localStorage.getItem('notes')) || [];
let editingNoteId = null;
let currentCategory = 'all';
let currentTodos = [];
let currentLinks = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    renderNotes();
    initializeNoteCreator();
    initializeImageUpload();
    setupEventListeners();
    
    // Verificar se é PWA e corrigir URLs se necessário
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        const correctPath = '/menota/';
        if (!window.location.href.includes(correctPath)) {
            window.history.replaceState(null, null, correctPath);
        }
    }
}

// ===== MANIPULAÇÃO DE NOTAS =====
function initializeNoteCreator() {
    const noteCreator = document.getElementById('noteCreator');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteText');
    
    if (noteCreator) {
        noteCreator.addEventListener('click', function() {
            if (this.classList.contains('compact')) {
                expandNoteCreator();
            }
        });
    }
    
    // Prevenir que clicks nos inputs recolham o editor
    if (titleInput) {
        titleInput.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    
    if (contentInput) {
        contentInput.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
}

function expandNoteCreator() {
    const noteCreator = document.getElementById('noteCreator');
    const titleInput = document.getElementById('noteTitle');
    
    noteCreator.classList.remove('compact');
    noteCreator.classList.add('expanded');
    
    // Focar no título se estiver vazio
    if (!titleInput.value) {
        setTimeout(() => {
            titleInput.focus();
        }, 100);
    }
    
    // Inicializar upload de imagem
    setTimeout(() => {
        initializeImageUpload();
    }, 100);
}

function collapseNoteCreator() {
    const noteCreator = document.getElementById('noteCreator');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteText');
    
    noteCreator.classList.remove('expanded');
    noteCreator.classList.add('compact');
    
    // Limpar campos
    titleInput.value = '';
    contentInput.value = '';
    editingNoteId = null;
    currentTodos = [];
    currentLinks = [];
    
    // Remover thumbnail se existir
    const thumbnail = noteCreator.querySelector('.note-thumbnail-container');
    if (thumbnail) {
        thumbnail.remove();
    }
    
    // Resetar categorias e seções
    document.querySelectorAll('.content-sections-container').forEach(container => {
        container.classList.remove('single-section');
    });
}

function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteText').value;
    const image = getCurrentNoteImage();
    
    if (!title && !content && !image && currentTodos.length === 0 && currentLinks.length === 0) {
        alert('A nota não pode estar vazia.');
        return;
    }
    
    const note = {
        id: editingNoteId || Date.now().toString(),
        title,
        content,
        image: image,
        category: currentCategory,
        createdAt: editingNoteId ? notes.find(n => n.id === editingNoteId)?.createdAt || new Date() : new Date(),
        updatedAt: new Date(),
        todos: [...currentTodos],
        links: [...currentLinks]
    };
    
    if (editingNoteId) {
        // Atualizar nota existente
        const index = notes.findIndex(n => n.id === editingNoteId);
        if (index !== -1) {
            notes[index] = note;
        }
    } else {
        // Adicionar nova nota
        notes.unshift(note);
    }
    
    localStorage.setItem('notes', JSON.stringify(notes));
    renderNotes();
    collapseNoteCreator();
    
    // Resetar variáveis temporárias
    currentTodos = [];
    currentLinks = [];
}

function editNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    expandNoteCreator();
    editingNoteId = noteId;
    
    // Preencher campos
    document.getElementById('noteTitle').value = note.title || '';
    document.getElementById('noteText').value = note.content || '';
    
    // Carregar imagem se existir
    if (note.image) {
        loadNoteImage(note);
    }
    
    // Carregar todos e links
    currentTodos = note.todos ? [...note.todos] : [];
    currentLinks = note.links ? [...note.links] : [];
    
    renderTodos();
    renderLinks();
}

function deleteNote(noteId) {
    if (confirm('Tem certeza que deseja excluir esta nota?')) {
        notes = notes.filter(note => note.id !== noteId);
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
    }
}

function renderNotes(notesToRender = notes) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;
    
    notesGrid.innerHTML = '';

    // Aplicar filtro de categoria
    if (currentCategory !== 'all') {
        notesToRender = notesToRender.filter(note => note.category === currentCategory);
    }

    notesToRender.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.setAttribute('data-note-id', note.id);
        
        let noteContent = `
            <div class="note-content">
        `;
        
        // Adicionar thumbnail se existir
        if (note.image) {
            noteContent += `
                <div class="note-thumbnail-container">
                    <img src="${note.image}" class="note-thumbnail" alt="Imagem da nota" 
                         onclick="viewNoteImage('${note.id}')">
                    <button class="remove-image-button-small" onclick="removeNoteImage('${note.id}', event)">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        noteContent += `
                <h3>${note.title || 'Sem título'}</h3>
                <div class="note-preview">${note.content || ''}</div>
            </div>
            <div class="note-actions">
                <button class="action-button image-button" onclick="addImageToExistingNote('${note.id}')" title="Adicionar imagem">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                </button>
                
                <button class="action-button edit-button" onclick="editNote('${note.id}')" title="Editar nota">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
                
                <button class="action-button delete-button-small" onclick="deleteNote('${note.id}')" title="Excluir nota">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `;
        
        noteCard.innerHTML = noteContent;
        notesGrid.appendChild(noteCard);
    });
}

// ===== FUNÇÕES DE IMAGEM =====
function initializeImageUpload() {
    const imageInput = document.getElementById('imageUpload');
    const imageUploadButton = document.querySelector('.image-upload-button');
    
    if (imageUploadButton && imageInput) {
        imageUploadButton.style.display = 'flex';
        imageUploadButton.style.opacity = '1';
        imageUploadButton.style.visibility = 'visible';
        
        imageUploadButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            imageInput.click();
        });
        
        imageInput.addEventListener('change', handleImageUpload);
    }
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const imageDataUrl = e.target.result;
        addImageToNote(imageDataUrl);
        event.target.value = '';
    };
    
    reader.onerror = function() {
        alert('Erro ao carregar a imagem. Tente novamente.');
    };
    
    reader.readAsDataURL(file);
}

function addImageToNote(imageDataUrl) {
    const noteCreator = document.querySelector('.note-creator.expanded') || 
                       document.querySelector('.note-editor.expanded');
    
    if (!noteCreator) {
        console.error('Editor de notas não encontrado');
        return;
    }
    
    const existingThumbnail = noteCreator.querySelector('.note-thumbnail-container');
    if (existingThumbnail) {
        existingThumbnail.remove();
    }
    
    const thumbnailContainer = document.createElement('div');
    thumbnailContainer.className = 'note-thumbnail-container';
    
    const thumbnail = document.createElement('img');
    thumbnail.className = 'note-thumbnail';
    thumbnail.src = imageDataUrl;
    thumbnail.alt = 'Imagem da nota';
    
    const removeButton = document.createElement('button');
    removeButton.className = 'remove-image-button';
    removeButton.innerHTML = '×';
    removeButton.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
    `;
    
    removeButton.addEventListener('click', function(e) {
        e.stopPropagation();
        thumbnailContainer.remove();
        updateNoteEditorLayout();
    });
    
    thumbnailContainer.appendChild(thumbnail);
    thumbnailContainer.appendChild(removeButton);
    
    const titleInput = noteCreator.querySelector('.title-input') || 
                      noteCreator.querySelector('#noteTitle');
    if (titleInput) {
        noteCreator.insertBefore(thumbnailContainer, titleInput);
    } else {
        noteCreator.prepend(thumbnailContainer);
    }
    
    updateNoteEditorLayout();
}

function addImageToExistingNote(noteId) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imageDataUrl = e.target.result;
            updateNoteImage(noteId, imageDataUrl);
        };
        
        reader.onerror = function() {
            alert('Erro ao carregar a imagem. Tente novamente.');
        };
        
        reader.readAsDataURL(file);
        document.body.removeChild(fileInput);
    });
    
    document.body.appendChild(fileInput);
    fileInput.click();
}

function updateNoteImage(noteId, imageDataUrl) {
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
        notes[noteIndex].image = imageDataUrl;
        notes[noteIndex].updatedAt = new Date();
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
    }
}

function removeNoteImage(noteId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (confirm('Remover imagem desta nota?')) {
        const noteIndex = notes.findIndex(note => note.id === noteId);
        
        if (noteIndex !== -1) {
            notes[noteIndex].image = null;
            notes[noteIndex].updatedAt = new Date();
            localStorage.setItem('notes', JSON.stringify(notes));
            renderNotes();
        }
    }
}

function getCurrentNoteImage() {
    const noteCreator = document.querySelector('.note-creator.expanded') || 
                       document.querySelector('.note-editor.expanded');
    
    if (noteCreator) {
        const thumbnail = noteCreator.querySelector('.note-thumbnail');
        return thumbnail ? thumbnail.src : null;
    }
    return null;
}

function loadNoteImage(note) {
    if (note.image) {
        addImageToNote(note.image);
    }
}

function updateNoteEditorLayout() {
    const noteCreator = document.querySelector('.note-creator.expanded') || 
                       document.querySelector('.note-editor.expanded');
    
    if (noteCreator) {
        const hasImage = noteCreator.querySelector('.note-thumbnail-container');
        if (hasImage) {
            noteCreator.classList.add('has-image');
        } else {
            noteCreator.classList.remove('has-image');
        }
    }
}

function viewNoteImage(noteId) {
    const note = notes.find(note => note.id === noteId);
    
    if (note && note.image) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        
        const img = document.createElement('img');
        img.src = note.image;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'image-modal-close';
        closeButton.innerHTML = '×';
        
        closeButton.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        modal.appendChild(img);
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
    }
}

// ===== TODO LIST FUNCTIONS =====
function addTodo() {
    currentTodos.push({ text: '', completed: false });
    renderTodos();
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;
    
    todoList.innerHTML = '';
    
    currentTodos.forEach((todo, index) => {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        
        todoItem.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} 
                   onchange="toggleTodo(${index})">
            <input type="text" class="todo-text ${todo.completed ? 'completed' : ''}" 
                   value="${todo.text}" placeholder="Nova tarefa..."
                   oninput="updateTodoText(${index}, this.value)"
                   onblur="saveTodo(${index})">
            <div class="todo-actions">
                <button class="todo-delete" onclick="removeTodo(${index})">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
        `;
        
        todoList.appendChild(todoItem);
    });
}

function toggleTodo(index) {
    if (currentTodos[index]) {
        currentTodos[index].completed = !currentTodos[index].completed;
        renderTodos();
    }
}

function updateTodoText(index, text) {
    if (currentTodos[index]) {
        currentTodos[index].text = text;
    }
}

function saveTodo(index) {
    if (currentTodos[index] && !currentTodos[index].text.trim()) {
        currentTodos.splice(index, 1);
    }
    renderTodos();
}

function removeTodo(index) {
    currentTodos.splice(index, 1);
    renderTodos();
}

// ===== LINK FUNCTIONS =====
function addLink() {
    const url = prompt('Digite a URL:');
    if (url && isValidUrl(url)) {
        currentLinks.push({
            url: url,
            title: getDomainFromUrl(url),
            thumbnail: null
        });
        renderLinks();
    } else if (url) {
        alert('Por favor, digite uma URL válida.');
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname;
    } catch (_) {
        return url;
    }
}

function renderLinks() {
    const linksList = document.getElementById('linksList');
    if (!linksList) return;
    
    linksList.innerHTML = '';
    
    currentLinks.forEach((link, index) => {
        const linkItem = document.createElement('div');
        linkItem.className = 'link-item';
        
        linkItem.innerHTML = `
            <div class="link-content">
                <div class="thumbnail-container">
                    <img src="" class="link-thumbnail loading" alt="Thumbnail" 
                         onerror="this.classList.add('error')">
                </div>
                <div class="link-info">
                    <a href="${link.url}" target="_blank" class="note-link">${link.title}</a>
                    <div class="link-url">${link.url}</div>
                    <div class="link-actions">
                        <button class="copy-link-button" onclick="copyLink('${link.url}')" title="Copiar link">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z"/>
                            </svg>
                        </button>
                        <button class="copy-link-button" onclick="removeLink(${index})" title="Remover link">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        linksList.appendChild(linkItem);
    });
}

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copiado para a área de transferência!');
    }).catch(() => {
        alert('Erro ao copiar link.');
    });
}

function removeLink(index) {
    currentLinks.splice(index, 1);
    renderLinks();
}

// ===== CATEGORY FUNCTIONS =====
function openCategoriesModal() {
    document.getElementById('categoriesModal').style.display = 'block';
    renderCategories();
}

function closeCategoriesModal() {
    document.getElementById('categoriesModal').style.display = 'none';
}

function renderCategories() {
    const categoriesList = document.getElementById('categoriesList');
    if (!categoriesList) return;
    
    const categories = getAllCategories();
    
    categoriesList.innerHTML = '';
    
    categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = `modal-category-item ${currentCategory === category.id ? 'active' : ''}`;
        categoryItem.innerHTML = `
            <span>${category.name}</span>
            <span class="category-count">${category.count}</span>
        `;
        
        categoryItem.addEventListener('click', () => {
            currentCategory = category.id;
            renderNotes();
            closeCategoriesModal();
        });
        
        categoriesList.appendChild(categoryItem);
    });
}

function getAllCategories() {
    const categories = [
        { id: 'all', name: 'Todas', count: notes.length },
        { id: 'personal', name: 'Pessoal', count: notes.filter(n => n.category === 'personal').length },
        { id: 'work', name: 'Trabalho', count: notes.filter(n => n.category === 'work').length },
        { id: 'ideas', name: 'Ideias', count: notes.filter(n => n.category === 'ideas').length }
    ];
    
    return categories;
}

function clearCategoryFilter() {
    currentCategory = 'all';
    renderNotes();
    closeCategoriesModal();
}

// ===== SEARCH FUNCTIONALITY =====
function searchNotes() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (!searchTerm) {
        renderNotes();
        return;
    }
    
    const filteredNotes = notes.filter(note => 
        (note.title && note.title.toLowerCase().includes(searchTerm)) ||
        (note.content && note.content.toLowerCase().includes(searchTerm)) ||
        (note.todos && note.todos.some(todo => todo.text.toLowerCase().includes(searchTerm)))
    );
    
    renderNotes(filteredNotes);
}

// ===== BACKUP FUNCTIONS =====
function exportNotes() {
    const dataStr = JSON.stringify(notes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `menota-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importNotes() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const importedNotes = JSON.parse(e.target.result);
                
                if (Array.isArray(importedNotes)) {
                    if (confirm(`Importar ${importedNotes.length} notas? Isso substituirá suas notas atuais.`)) {
                        notes = importedNotes;
                        localStorage.setItem('notes', JSON.stringify(notes));
                        renderNotes();
                        alert('Notas importadas com sucesso!');
                    }
                } else {
                    alert('Arquivo inválido.');
                }
            } catch (error) {
                alert('Erro ao importar notas. Arquivo corrompido.');
            }
        };
        
        reader.readAsText(file);
    });
    
    fileInput.click();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Fechar modal ao clicar fora
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('categoriesModal');
        if (event.target === modal) {
            closeCategoriesModal();
        }
    });
    
    // Busca em tempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', searchNotes);
    }
    
    // Tecla ESC para cancelar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const expandedEditor = document.querySelector('.note-creator.expanded');
            if (expandedEditor) {
                collapseNoteCreator();
            }
        }
    });
}

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/menota/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registrado: ', registration.scope);
            })
            .catch(function(error) {
                console.log('Falha no ServiceWorker: ', error);
            });
    });
}
