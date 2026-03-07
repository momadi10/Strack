import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TransactionType, CategoryItem } from '../types';
import { useTheme } from '../context/ThemeContext';
import { addCategory, deleteCategory, updateCategory, reorderCategories } from '../lib/supabase-storage';
import { CATEGORIZED_ICONS } from '../constants/icons';
import { useToast } from '../context/ToastContext';
import { CategoryIcon } from '../components/CategoryIcon';
import { useData } from '../context/DataContext';

interface CategorySettingsScreenProps {
    navigation: any;
}

export const CategorySettingsScreen: React.FC<CategorySettingsScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const { showToast } = useToast();
    const { categories: allCategories, refreshData } = useData();

    const [type, setType] = useState<TransactionType>('expense');
    const [isLoading, setIsLoading] = useState(false);

    // Filter categories locally from global state
    const categories = allCategories.filter(c => c.type === type);

    // Add/Edit Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('📂');
    const [newCatColor, setNewCatColor] = useState(theme.primary);
    const [newCatSortOrder, setNewCatSortOrder] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);

    const styles = getStyles(theme, insets, isDark);

    const handleAddCategory = async () => {
        if (!newCatName.trim()) {
            Alert.alert('Error', 'Please enter a category name');
            return;
        }

        setIsLoading(true);
        try {
            if (editingId) {
                await updateCategory(editingId, {
                    name: newCatName,
                    icon: newCatIcon,
                    color: newCatColor,
                    type,
                    sort_order: newCatSortOrder
                });
                showToast('Category updated successfully', 'success');
            } else {
                await addCategory({
                    name: newCatName,
                    icon: newCatIcon,
                    color: theme.primary,
                    type,
                    sort_order: categories.length,
                });
                showToast('Category added successfully', 'success');
            }

            // Refresh global data
            await refreshData();
            setModalVisible(false);
            setNewCatName('');
            setEditingId(null);
        } catch (error) {
            showToast('Failed to save category', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(id);
                            await refreshData();
                            showToast('Category deleted successfully', 'success');
                        } catch (error) {
                            showToast('Failed to delete category', 'error');
                        }
                    }
                },
            ]
        );
    };

    const moveItem = async (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categories.length) return;

        const newCategories = [...categories];
        const item = newCategories.splice(index, 1)[0];
        newCategories.splice(newIndex, 0, item);

        try {
            await reorderCategories(newCategories);
            await refreshData();
        } catch (error) {
            showToast('Failed to save order', 'error');
        }
    };

    const renderItem = ({ item, index }: { item: CategoryItem; index: number }) => {
        return (
            <View style={styles.categoryRow}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Ionicons name="remove-circle" size={24} color="#FF4D4D" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.categoryContent}
                    onPress={() => {
                        setEditingId(item.id);
                        setNewCatName(item.name);
                        setNewCatIcon(item.icon);
                        setNewCatColor(item.color);
                        setNewCatSortOrder(item.sort_order);
                        setModalVisible(true);
                    }}
                >
                    <View style={[styles.iconContainer, { borderColor: item.color }]}>
                        <CategoryIcon category={item.id} icon={item.icon} color={item.color} size={24} />
                    </View>
                    <View style={styles.categoryNameContainer}>
                        <Text style={styles.categoryName}>{item.name}</Text>
                        {item.synced === false && (
                            <View style={styles.offlineBadge}>
                                <Ionicons name="cloud-offline-outline" size={10} color="#F59E0B" />
                                <Text style={styles.offlineText}>Offline</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.dragHandle}>
                    <View style={styles.orderButtons}>
                        <TouchableOpacity onPress={() => moveItem(index, 'up')} disabled={index === 0}>
                            <Ionicons name="chevron-up" size={20} color={index === 0 ? theme.border : theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => moveItem(index, 'down')} disabled={index === categories.length - 1}>
                            <Ionicons name="chevron-down" size={20} color={index === categories.length - 1 ? theme.border : theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Ionicons name="menu-outline" size={24} color={theme.textSecondary} />
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Category settings</Text>
                <TouchableOpacity
                    style={styles.typeSelector}
                    onPress={() => setType(type === 'expense' ? 'income' : 'expense')}
                >
                    <Text style={styles.typeText}>{type === 'expense' ? 'Expense' : 'Income'}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.text} />
                </TouchableOpacity>
            </View>

            {/* Drag Hint */}
            <View style={styles.hintContainer}>
                <Ionicons name="swap-vertical" size={16} color="#FF4D4D" style={styles.hintIcon} />
                <Text style={styles.hintText}>You can drag the category up and down as you want.</Text>
            </View>

            <FlatList
                data={categories}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Bottom Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        setEditingId(null);
                        setNewCatName('');
                        setNewCatIcon('📂');
                        setNewCatColor(theme.primary);
                        setNewCatSortOrder(categories.length);
                        setModalVisible(true);
                    }}
                >
                    <Text style={styles.addButtonText}>+ ADD CATEGORY</Text>
                </TouchableOpacity>
            </View>

            {/* Add/Edit Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalFullContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBackButton}>
                            <Ionicons name="arrow-back" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalFullTitle}>{editingId ? 'Edit category' : 'Add category'}</Text>
                        <TouchableOpacity
                            style={styles.modalFullTypeSelector}
                            onPress={() => setType(type === 'expense' ? 'income' : 'expense')}
                        >
                            <Text style={styles.typeText}>{type === 'expense' ? 'Expense' : 'Income'}</Text>
                            <Ionicons name="chevron-down" size={16} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContentBody}>
                        {/* Icon Preview */}
                        <View style={styles.previewSection}>
                            <View style={[styles.previewIconWrap, { borderColor: theme.primary + '80' }]}>
                                <CategoryIcon category={editingId || 'other'} icon={newCatIcon} color={theme.text} size={48} />
                            </View>
                        </View>

                        {/* Name Input */}
                        <View style={styles.searchBarWrap}>
                            <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="Category name"
                                placeholderTextColor={theme.textSecondary}
                                value={newCatName}
                                onChangeText={setNewCatName}
                            />
                        </View>

                        {/* Categorized Icons list */}
                        <FlatList
                            data={CATEGORIZED_ICONS}
                            keyExtractor={(item) => item.name}
                            contentContainerStyle={styles.iconListContent}
                            renderItem={({ item }) => (
                                <View style={styles.iconCategoryGroup}>
                                    <Text style={styles.iconCategoryTitle}>{item.name}</Text>
                                    <View style={styles.iconGrid}>
                                        {item.icons.map((icon, i) => (
                                            <TouchableOpacity
                                                key={`${item.name}-${i}`}
                                                style={[
                                                    styles.iconGridItem,
                                                    newCatIcon === icon && styles.iconGridItemActive,
                                                    newCatIcon === icon && { borderColor: theme.primary + '80' }
                                                ]}
                                                onPress={() => setNewCatIcon(icon)}
                                            >
                                                <Text style={styles.gridEmoji}>{icon}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>

                    {/* Footer ADD button */}
                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={styles.modalAddButton}
                            onPress={handleAddCategory}
                            disabled={isLoading}
                        >
                            <Text style={styles.modalAddButtonText}>{isLoading ? 'SAVING...' : (editingId ? 'UPDATE' : 'ADD')}</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
};

const getStyles = (theme: any, insets: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: theme.text,
        flex: 1,
        marginLeft: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#2D3748' : '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    typeText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.text,
        marginRight: 4,
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: isDark ? theme.surface : '#FFFFFF',
    },
    hintIcon: {
        marginRight: 8,
    },
    hintText: {
        fontSize: 13,
        color: '#FF4D4D',
    },
    listContent: {
        paddingVertical: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    deleteButton: {
        marginRight: 12,
    },
    categoryContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#2D3748' : '#FFFFFF',
        marginRight: 16,
    },
    categoryName: {
        fontSize: 17,
        fontWeight: '500',
        color: theme.text,
    },
    categoryNameContainer: {
        flex: 1,
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 2,
        gap: 4,
    },
    offlineText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#F59E0B',
        textTransform: 'uppercase',
    },
    dragHandle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderButtons: {
        marginRight: 8,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    addButton: {
        backgroundColor: theme.primary,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    modalFullContainer: {
        flex: 1,
        backgroundColor: theme.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    modalBackButton: {
        padding: 4,
    },
    modalFullTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.text,
        flex: 1,
        marginLeft: 16,
    },
    modalFullTypeSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#2D3748' : '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
    },
    modalContentBody: {
        flex: 1,
    },
    previewSection: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    previewIconWrap: {
        width: 100,
        height: 100,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? '#2D3748' : '#FFFFFF',
    },
    searchBarWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDark ? '#2D3748' : '#F3F4F6',
        marginHorizontal: 16,
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.border,
    },
    searchIcon: {
        marginRight: 10,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        color: theme.text,
    },
    iconListContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    iconCategoryGroup: {
        marginBottom: 24,
    },
    iconCategoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.text,
        marginBottom: 16,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    iconGridItem: {
        width: (Dimensions.get('window').width - 32 - 48) / 5, // 5 per row roughly
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isDark ? theme.surface : '#FFFFFF',
        borderWidth: 1,
        borderColor: theme.border,
    },
    iconGridItemActive: {
        borderWidth: 2,
    },
    gridEmoji: {
        fontSize: 28,
    },
    modalFooter: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    modalAddButton: {
        backgroundColor: theme.primary,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    modalAddButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
});
