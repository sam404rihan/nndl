"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTests, addTest, updateTest, TestItem } from '@/services/testService';
import { Search, Plus, Edit2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function TestCatalog() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [filteredTests, setFilteredTests] = useState<TestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestItem | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter(); // Need to add import

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setRole('admin');
    loadTests();
  };

  useEffect(() => {
    // Filter tests based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = tests.filter(t =>
        t.code.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query)
      );
      setFilteredTests(filtered);
    } else {
      setFilteredTests(tests);
    }
  }, [searchQuery, tests]);

  const loadTests = async () => {
    const data = await getTests();
    setTests(data as TestItem[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'admin') return; // Security check

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const testData = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      price: Number(formData.get('price')),
      units: formData.get('units') as string,
      reference_range: formData.get('range') as string,
    };

    try {
      if (editingTest?.id) {
        await updateTest(editingTest.id, testData);
      } else {
        await addTest(testData);
      }
      setIsModalOpen(false);
      setEditingTest(null);
      loadTests();
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test. You might not have permission.');
    }
  };

  const handleEdit = (test: TestItem) => {
    if (role !== 'admin') return;
    setEditingTest(test);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    if (role !== 'admin') return;
    setEditingTest(null);
    setIsModalOpen(true);
  };

  return (
    <div
      className="p-6"
      style={{
        background: 'var(--color-background)',
        minHeight: '100vh'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Test Catalog
          </h2>
          <p
            className="mt-1"
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            Configuration data for lab tests
          </p>
        </div>
        {role === 'admin' && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 flex items-center gap-2 font-medium"
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Plus size={18} />
            Add Test
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div
          className="relative max-w-md"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)'
          }}
        >
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-4 py-3"
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 'var(--font-size-base)',
              color: 'var(--color-text-primary)',
              paddingLeft: '3rem'
            }}
          />
        </div>
      </div>

      {/* Tests Table */}
      <div
        className="border-2 overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <table className="min-w-full">
          <thead
            className="border-b-2"
            style={{
              background: 'var(--color-background)',
              borderColor: 'var(--color-border)'
            }}
          >
            <tr>
              <th
                className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                Code
              </th>
              <th
                className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                Name
              </th>
              <th
                className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                Reference Range
              </th>
              <th
                className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)'
                }}
              >
                Price
              </th>
              {role === 'admin' && (
                <th
                  className="px-6 py-3 text-left uppercase tracking-wide font-bold"
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-secondary)'
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {filteredTests.map((test) => (
              <tr key={test.id} className="transition-colors">
                <td
                  className="px-6 py-4 font-mono font-semibold"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-primary)'
                  }}
                >
                  {test.code}
                </td>
                <td
                  className="px-6 py-4"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  {test.name}
                </td>
                <td
                  className="px-6 py-4"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-tertiary)'
                  }}
                >
                  {test.reference_range} {test.units}
                </td>
                <td
                  className="px-6 py-4 font-bold"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  ${test.price}
                </td>
                {role === 'admin' && (
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(test)}
                      className="p-1 rounded flex items-center gap-1"
                      style={{
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        fontSize: 'var(--font-size-sm)'
                      }}
                      title="Edit test"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTests.length === 0 && (
          <div
            className="p-8 text-center"
            style={{ color: 'var(--color-text-disabled)' }}
          >
            {searchQuery ? 'No tests match your search' : 'No tests configured yet'}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-black/50"
          onClick={() => {
            setIsModalOpen(false);
            setEditingTest(null);
          }}
        >
          <div
            className="w-full max-w-2xl p-6"
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-xl font-bold mb-4"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {editingTest ? 'Edit Test' : 'Add New Test'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block mb-1 font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    Test Name *
                  </label>
                  <input
                    name="name"
                    defaultValue={editingTest?.name}
                    placeholder="Complete Blood Count"
                    required
                    className="w-full px-3 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    Code *
                  </label>
                  <input
                    name="code"
                    defaultValue={editingTest?.code}
                    placeholder="CBC"
                    required
                    className="w-full px-3 py-2 font-mono"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label
                    className="block mb-1 font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    Price *
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingTest?.price}
                    placeholder="150.00"
                    required
                    className="w-full px-3 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    Units *
                  </label>
                  <input
                    name="units"
                    defaultValue={editingTest?.units}
                    placeholder="g/dL"
                    required
                    className="w-full px-3 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block mb-1 font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    Ref Range *
                  </label>
                  <input
                    name="range"
                    defaultValue={editingTest?.reference_range}
                    placeholder="12-17"
                    required
                    className="w-full px-3 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--font-size-sm)',
                      background: 'var(--color-background)',
                      color: 'var(--color-text-primary)'
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTest(null);
                  }}
                  className="px-4 py-2"
                  style={{
                    color: 'var(--color-text-secondary)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-medium"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)'
                  }}
                >
                  {editingTest ? 'Update Test' : 'Add Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}