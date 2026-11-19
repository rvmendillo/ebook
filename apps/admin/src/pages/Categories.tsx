import { useState } from 'react';

import type { Category } from '../../../../shared/types';
import { PageHead } from '../components/Layout';
import { useAdmin, useLoad } from '../lib/admin';
import { slugify } from '../lib/markdown';

type Editable = Omit<Category, 'id'> & { id?: string };

const BLANK: Editable = { slug: '', name: '', description: '', icon: '✦', color: '#4F46E5', sort_order: 99 };
const SUGGESTED_ICONS = ['∑', '♪', '</>', '⚛', 'Aa', '⚡', '🎨', '📈', '🧠', '🌍', '📷', '🍳'];

export function Categories() {
  const { data, notify } = useAdmin();
  const { data: cats, error, reload } = useLoad(() => data.listCategories(), [data]);
  const [editing, setEditing] = useState<Editable | null>(null);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return notify('Name is required', 'error');
    try {
      await data.saveCategory({ ...editing, slug: editing.slug || slugify(editing.name) });
      notify('Category saved');
      setEditing(null);
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Save failed', 'error');
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete “${c.name}”? Its items become uncategorised.`)) return;
    try {
      await data.deleteCategory(c.id);
      notify('Deleted');
      reload();
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Delete failed', 'error');
    }
  };

  if (error) return <div className="notice error">{error.message}</div>;

  return (
    <>
      <PageHead title="Categories" subtitle="Subjects shown as tiles on the home screen — math, music, programming and more.">
        <button className="btn primary" onClick={() => setEditing({ ...BLANK, sort_order: (cats?.length ?? 0) + 1 })}>
          + New category
        </button>
      </PageHead>

      {editing ? (
        <div className="card stack" style={{ marginBottom: 16 }}>
          <h2>{editing.id ? 'Edit category' : 'New category'}</h2>
          <div className="fields">
            <label className="field">
              Name
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })}
              />
            </label>
            <label className="field">
              Slug
              <input value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
            </label>
            <label className="field">
              Icon <span className="help">An emoji or 1–3 characters</span>
              <input value={editing.icon} maxLength={4} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} />
            </label>
            <label className="field">
              Colour
              <input type="color" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value.toUpperCase() })} />
            </label>
            <label className="field">
              Order
              <input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
            </label>
          </div>
          <div className="row">
            {SUGGESTED_ICONS.map((i) => (
              <button key={i} className="btn small" onClick={() => setEditing({ ...editing, icon: i })}>
                {i}
              </button>
            ))}
          </div>
          <label className="field">
            Description
            <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <div className="row">
            <button className="btn primary" onClick={() => void save()}>
              Save
            </button>
            <button className="btn ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid two">
        {(cats ?? []).map((c) => (
          <div className="card" key={c.id}>
            <div className="row">
              <div className="thumb" style={{ background: c.color }}>
                {c.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3>{c.name}</h3>
                <div className="muted small">{c.description || '—'}</div>
                <div className="faint small">/{c.slug} · order {c.sort_order}</div>
              </div>
              <button className="btn small" onClick={() => setEditing(c)}>
                Edit
              </button>
              <button className="btn small danger" onClick={() => void remove(c)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
