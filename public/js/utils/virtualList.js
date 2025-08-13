// utils/virtualList.js
export function renderVirtualList({ container, total, itemHeight, renderWindow }) {
  const phantom = document.createElement('div');
  phantom.className = 'virtual-list-phantom';
  phantom.style.height = `${total * itemHeight}px`;
  container.classList.add('virtual-list-container');
  container.innerHTML = '';
  container.appendChild(phantom);

  function update() {
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(total, start + Math.ceil(height / itemHeight) + 1);
    phantom.innerHTML = '';
    for (let i = start; i < end; i++) {
      const item = document.createElement('div');
      item.className = 'virtual-list-item';
      item.style.top = `${i * itemHeight}px`;
      renderWindow(i, item);
      phantom.appendChild(item);
    }
  }

  container.addEventListener('scroll', update);
  update();
}

