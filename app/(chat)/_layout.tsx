import React, { Children } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Slot, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { View } from '@/components/Themed';
import Chat from './chat';


export default function ChatLayout() {
    const colorScheme = useColorScheme();
    
    return(
        <Slot/>
    );
    }