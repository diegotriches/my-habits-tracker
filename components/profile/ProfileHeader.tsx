// components/profile/ProfileHeader.tsx
import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase';
import { Profile } from '@/types/database';
import { hapticFeedback } from '@/utils/haptics';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface ProfileHeaderProps {
  profile: Profile;
  onAvatarUpdated?: () => void;
}

export default function ProfileHeader({ profile, onAvatarUpdated }: ProfileHeaderProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const avatarUrl = profile.avatar_url;
  const initial = profile.display_name?.charAt(0).toUpperCase() || 'U';

  const handleAvatarPress = async () => {
    hapticFeedback.light();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à sua galeria para alterar a foto de perfil.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets?.[0]) return;

    await uploadAvatar(result.assets[0].uri);
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;

    setUploading(true);

    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
      } as any);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, formData, {
          upsert: true,
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await (supabase
        .from('profiles') as any)
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      hapticFeedback.success();
      onAvatarUpdated?.();
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error);
      hapticFeedback.error();
      Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={handleAvatarPress}
        activeOpacity={0.7}
        disabled={uploading}
      >
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}

        <View style={[styles.editBadge, { backgroundColor: colors.primary }]}>
          {uploading ? (
            <ActivityIndicator size={12} color="#FFFFFF" />
          ) : (
            <Icon name="edit" size={12} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]}>
          {profile.display_name || 'Usuário'}
        </Text>
        <Text style={[styles.hint, { color: colors.textTertiary }]}>
          Toque na foto para alterar
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  info: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
});