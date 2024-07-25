import React, { Children } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Slot, Stack, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { View } from '@/components/Themed';


export default function SettingsLayout() {
    const colorScheme = useColorScheme();
    
    return(
        <Slot/>
    );
    }