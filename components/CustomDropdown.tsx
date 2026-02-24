/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Option {
    id: string | number;
    label: string;
    subLabel?: string;
}

interface CustomDropdownProps {
    options: Option[];
    value: string | number;
    onChange: (value: string | number) => void;
    placeholder: string;
    label?: string;
}

export default function CustomDropdown({
    options,
    value,
    onChange,
    placeholder,
    label,
}: CustomDropdownProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [search, setSearch] = useState('');

    const selectedOption = options.find((opt) => opt.id === value);

    const filteredOptions = options.filter((opt) =>
        opt?.label?.toLowerCase().includes(search?.toLowerCase()) ||
        (opt?.subLabel && opt?.subLabel?.toLowerCase().includes(search?.toLowerCase()))
    );

    return (
        <View className="mb-4">
            {label && (
                <Text className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-1">
                    {label}
                </Text>
            )}
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="bg-white border border-slate-200 rounded-xl p-4 flex-row justify-between items-center shadow-sm"
            >
                <Text className={selectedOption ? 'text-slate-900 font-bold' : 'text-slate-400 font-bold'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94a3b8" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl h-[80%] p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-900">{placeholder}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2">
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="bg-slate-50 rounded-xl px-4 py-2 flex-row items-center mb-4">
                            <Ionicons name="search" size={18} color="#94a3b8" />
                            <TextInput
                                placeholder="Search..."
                                value={search}
                                onChangeText={setSearch}
                                className="flex-1 ml-3 h-10 text-slate-900 font-medium"
                            />
                        </View>

                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => {
                                        onChange(item.id);
                                        setModalVisible(false);
                                        setSearch('');
                                    }}
                                    className={`py-4 border-b border-slate-50 flex-row justify-between items-center ${value === item.id ? 'bg-indigo-50/50 -mx-6 px-6' : ''
                                        }`}
                                >
                                    <View className="flex-1">
                                        <Text className={`text-base ${value === item.id ? 'text-indigo-600 font-bold' : 'text-slate-700 font-medium'}`}>
                                            {item.label}
                                        </Text>
                                        {item.subLabel && (
                                            <Text className="text-xs text-slate-400 mt-1">
                                                {item.subLabel}
                                            </Text>
                                        )}
                                    </View>
                                    {value === item.id && (
                                        <Ionicons name="checkmark" size={20} color="#4f46e5" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View className="py-20 items-center">
                                    <Text className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                                        No Results Found
                                    </Text>
                                </View>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}
