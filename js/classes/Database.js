class Database {
  #prefix = 'motus_';

  get(key) {
    try {
      return JSON.parse(localStorage.getItem(this.#prefix + key));
    } catch {
      return null;
    }
  }

  set(key, value) {
    localStorage.setItem(this.#prefix + key, JSON.stringify(value));
  }

  remove(key) {
    localStorage.removeItem(this.#prefix + key);
  }

  getList(key) {
    return this.get(key) ?? [];
  }

  push(key, item) {
    const list = this.getList(key);
    list.push(item);
    this.set(key, list);
    return item;
  }
}
