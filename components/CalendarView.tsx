import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Transaction } from '../types';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

interface CalendarViewProps {
    transactions: Transaction[];
    currentDate: Date;
}

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export const CalendarView: React.FC<CalendarViewProps> = ({ transactions, currentDate }) => {
    const { theme, isDark } = useTheme();
    const styles = getStyles(theme, isDark);

    const monthData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of current month
        const firstDay = new Date(year, month, 1);
        const startDayOfWeek = firstDay.getDay(); // 0-6

        // Last day of current month
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Previous month total days
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        const days = [];

        // Padding from prev month
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonthLastDay - i,
                month: month - 1,
                year,
                isCurrentMonth: false,
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: i,
                month,
                year,
                isCurrentMonth: true,
            });
        }

        // Padding from next month (6 rows of 7 = 42 total cells)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: i,
                month: month + 1,
                year,
                isCurrentMonth: false,
            });
        }

        return days;
    }, [currentDate]);

    const stats = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const monthTransactions = transactions.filter(t => {
            const dt = new Date(t.date);
            return dt.getFullYear() === year && dt.getMonth() === month;
        });

        const income = monthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        return { income, expense, balance: income - expense };
    }, [transactions, currentDate]);

    const dailyTotals = useMemo(() => {
        const totals: { [key: string]: number } = {};
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        transactions.forEach(t => {
            const dt = new Date(t.date);
            if (dt.getFullYear() === year && dt.getMonth() === month) {
                const day = dt.getDate();
                if (t.type === 'expense') {
                    totals[day] = (totals[day] || 0) + t.amount;
                }
            }
        });

        return totals;
    }, [transactions, currentDate]);

    const renderDay = ({ item }: { item: any }) => {
        const total = item.isCurrentMonth ? (dailyTotals[item.date] || 0) : 0;
        const isToday = item.isCurrentMonth &&
            item.date === new Date().getDate() &&
            item.month === new Date().getMonth() &&
            item.year === new Date().getFullYear();

        return (
            <View style={[styles.dayCell, !item.isCurrentMonth && styles.dayCellOutside]}>
                <View style={[styles.dateWrap, isToday && styles.todayWrap]}>
                    <Text style={[styles.dateText, isToday && styles.todayText, !item.isCurrentMonth && styles.dateTextOutside]}>
                        {item.date}
                    </Text>
                </View>
                {total > 0 && (
                    <Text style={styles.dailyTotal}>${total.toFixed(total < 10 ? 2 : 0)}</Text>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Summary Header */}
            <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Income</Text>
                    <Text style={[styles.summaryValue, styles.incomeValue]}>${stats.income.toFixed(0)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Expense</Text>
                    <Text style={[styles.summaryValue, styles.expenseValue]}>${stats.expense.toFixed(2)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Balance</Text>
                    <Text style={[styles.summaryValue, styles.balanceValue]}>${stats.balance.toFixed(2)}</Text>
                </View>
            </View>

            {/* Week Header */}
            <View style={styles.weekHeader}>
                {DAYS_OF_WEEK.map(day => (
                    <Text key={day} style={styles.weekDayText}>{day}</Text>
                ))}
            </View>

            {/* Calendar Grid */}
            <FlatList
                data={monthData}
                renderItem={renderDay}
                numColumns={7}
                keyExtractor={(item, index) => `day-${index}`}
                scrollEnabled={false}
                contentContainerStyle={styles.gridContent}
            />
        </View>
    );
};

const { width } = Dimensions.get('window');
const CELL_SIZE = width / 7;

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    summaryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: theme.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    incomeValue: {
        color: '#22C55E',
    },
    expenseValue: {
        color: '#FF4D4D',
    },
    balanceValue: {
        color: '#F59E0B',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: theme.border,
    },
    weekHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
        borderBottomWidth: 0.5,
        borderBottomColor: theme.border,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: theme.textSecondary,
    },
    gridContent: {
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
    },
    dayCell: {
        width: CELL_SIZE,
        height: 80,
        padding: 6,
        borderWidth: 0.25,
        borderColor: isDark ? '#2D3748' : '#E5E7EB',
        justifyContent: 'space-between',
    },
    dayCellOutside: {
        backgroundColor: isDark ? '#1A202C' : '#F9FAFB',
    },
    dateWrap: {
        width: 24,
        height: 24,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayWrap: {
        backgroundColor: theme.primary,
    },
    dateText: {
        fontSize: 13,
        color: theme.text,
    },
    todayText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    dateTextOutside: {
        color: theme.textSecondary,
        opacity: 0.5,
    },
    dailyTotal: {
        fontSize: 11,
        color: '#FF4D4D',
        fontWeight: '600',
    },
});
