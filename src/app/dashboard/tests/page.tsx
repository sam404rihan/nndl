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
    <div className="min-h-screen" style={{ background: '#F8F9FB' }}>
      {/* Header */}
      <div className="border-b sticky top-0 z-10 backdrop-blur-sm" style={{
        background: 'rgba(255, 255, 255, 0.98)',
        borderColor: 'rgba(0,0,0,0.06)'
      }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1F2937', letterSpacing: '-0.025em' }}>
              Test Catalog
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
              Configuration data for lab tests
            </p>
          </div>
          {role === 'admin' && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2.5 flex items-center gap-2 font-semibold rounded-lg transition-all"
              style={{
                background: '#4A6FA5',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >
              <Plus size={18} />
              Add Test
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9CA3AF' }}
          />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-3 pr-4 rounded-lg transition-all"
            style={{
              background: 'white',
              border: '1px solid rgba(0,0,0,0.1)',
              outline: 'none',
              color: '#1F2937',
              paddingLeft: '3rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          />
        </div>
      </div>

      {/* Tests Table */}
      <div className="overflow-hidden" style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <table className="min-w-full">
          <thead style={{ background: '#F9FAFB', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Reference Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Price
              </th>
              {role === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
            {filteredTests.map((test, idx) => (
              <tr key={test.id} className="transition-colors hover:bg-slate-50" style={{
                borderBottom: idx < filteredTests.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none'
              }}>
                <td className="px-6 py-4 font-mono font-semibold text-sm" style={{ color: '#4A6FA5' }}>
                  {test.code}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: '#1F2937' }}>
                  {test.name}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: '#6B7280' }}>
                  {test.reference_range} {test.units}
                </td>
                <td className="px-6 py-4 font-bold text-sm" style={{ color: '#1F2937' }}>
                  ₹{test.price}
                </td>
                {role === 'admin' && (
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleEdit(test)}
                      className="p-1.5 rounded flex items-center gap-1.5 text-sm font-medium transition-all hover:bg-slate-100"
                      style={{
                        color: '#6B7280',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none'
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
          className="fixed inset-0 flex items-center justify-center p-4 z-100"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => {
            setIsModalOpen(false);
            setEditingTest(null);
          }}
        >
          <div
            className="w-full max-w-2xl p-6"
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4" style={{ color: '#1F2937' }}>
              {editingTest ? 'Edit Test' : 'Add New Test'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-sm" style={{ color: '#6B7280' }}>
                    Test Name *
                  </label>
                  <input
                    name="name"
                    defaultValue={editingTest?.name}
                    placeholder="Complete Blood Count"
                    required
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      border: '1px solid rgba(0,0,0,0.15)',
                      background: '#F9FAFB',
                      color: '#1F2937'
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-sm" style={{ color: '#6B7280' }}>
                    Code *
                  </label>
                  <input
                    name="code"
                    defaultValue={editingTest?.code}
                    placeholder="CBC"
                    required
                    className="w-full px-3 py-2 font-mono rounded-lg"
                    style={{
                      border: '1px solid rgba(0,0,0,0.15)',
                      background: '#F9FAFB',
                      color: '#1F2937'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-sm" style={{ color: '#6B7280' }}>
                    Price *
                  </label>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingTest?.price}
                    placeholder="150.00"
                    required
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      border: '1px solid rgba(0,0,0,0.15)',
                      background: '#F9FAFB',
                      color: '#1F2937'
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-sm" style={{ color: '#6B7280' }}>
                    Units *
                  </label>
                  <input
                    name="units"
                    defaultValue={editingTest?.units}
                    placeholder="g/dL"
                    required
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      border: '1px solid rgba(0,0,0,0.15)',
                      background: '#F9FAFB',
                      color: '#1F2937'
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-semibold text-sm" style={{ color: '#6B7280' }}>
                    Ref Range *
                  </label>
                  <input
                    name="range"
                    defaultValue={editingTest?.reference_range}
                    placeholder="12-17"
                    required
                    className="w-full px-3 py-2 rounded-lg"
                    style={{
                      border: '1px solid rgba(0,0,0,0.15)',
                      background: '#F9FAFB',
                      color: '#1F2937'
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingTest(null);
                  }}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    color: '#6B7280',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg"
                  style={{
                    background: '#4A6FA5',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  Add Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}